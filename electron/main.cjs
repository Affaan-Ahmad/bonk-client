const { app, BrowserWindow, dialog, ipcMain, protocol, shell } = require("electron");
const { spawn } = require("child_process");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const isDev = !app.isPackaged;

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_GAME_NAME = process.env.RIOT_GAME_NAME;
const RIOT_TAG_LINE = process.env.RIOT_TAG_LINE;
const ACCOUNT_REGION = process.env.RIOT_ACCOUNT_REGION ?? "europe";
const PLATFORM_REGION = process.env.RIOT_PLATFORM_REGION ?? "me1";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "bonk-lcu",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

autoUpdater.logger = log;
autoUpdater.autoDownload = false;

function setupAutoUpdater() {
  if (isDev) {
    return;
  }

  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for BONK Client update...");
  });

  autoUpdater.on("update-available", async (info) => {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "BONK Client Update",
      message: `Update available: ${info.version}`,
      detail: "A new BONK Client update is available. Download it now?",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-not-available", () => {
    log.info("BONK Client is up to date.");
  });

  autoUpdater.on("download-progress", (progress) => {
    log.info(`Downloading BONK Client update: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on("update-downloaded", async () => {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "BONK Client Update Ready",
      message: "Update downloaded.",
      detail: "Restart BONK Client now to install the update?",
      buttons: ["Restart & Install", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  autoUpdater.on("error", (error) => {
    log.error("BONK Client updater error:", error);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      log.error("BONK Client update check failed:", error);
    });
  }, 3000);
}

function getConfigPath() {
  return path.join(app.getPath("userData"), "bonk-client-config.json");
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(getConfigPath(), "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

function getPossibleLockfilePaths() {
  const systemDrive = process.env.SystemDrive ?? "C:";
  const homeDirectory = os.homedir();
  const config = readConfig();
  const savedLeagueFolder = config.leagueFolderPath;

  return [
    savedLeagueFolder ? path.join(savedLeagueFolder, "lockfile") : null,
    process.env.LEAGUE_LOCKFILE_PATH,
    path.join(systemDrive, "Riot Games", "League of Legends", "lockfile"),
    path.join(systemDrive, "Program Files", "Riot Games", "League of Legends", "lockfile"),
    path.join(
      systemDrive,
      "Program Files (x86)",
      "Riot Games",
      "League of Legends",
      "lockfile",
    ),
    path.join(homeDirectory, "Riot Games", "League of Legends", "lockfile"),
  ].filter(Boolean);
}

function getPossibleLeagueClientPaths() {
  const systemDrive = process.env.SystemDrive ?? "C:";
  const homeDirectory = os.homedir();
  const config = readConfig();
  const savedLeagueFolder = config.leagueFolderPath;
  const configuredLeagueFolder = process.env.LEAGUE_FOLDER_PATH;
  const configuredLeagueExe = process.env.LEAGUE_EXE_PATH;
  const commonDrives = process.platform === "win32" ? [systemDrive, "C:", "D:", "E:", "F:"] : [systemDrive];
  const uniqueDrives = [...new Set(commonDrives.filter(Boolean))];

  return [
    configuredLeagueExe,
    savedLeagueFolder ? path.join(savedLeagueFolder, "LeagueClient.exe") : null,
    configuredLeagueFolder ? path.join(configuredLeagueFolder, "LeagueClient.exe") : null,
    ...uniqueDrives.flatMap((drive) => [
      path.join(drive, "League of Legends", "LeagueClient.exe"),
      path.join(drive, "Games", "League of Legends", "LeagueClient.exe"),
      path.join(drive, "Riot Games", "League of Legends", "LeagueClient.exe"),
      path.join(drive, "Program Files", "Riot Games", "League of Legends", "LeagueClient.exe"),
      path.join(drive, "Program Files (x86)", "Riot Games", "League of Legends", "LeagueClient.exe"),
    ]),
    path.join(homeDirectory, "Riot Games", "League of Legends", "LeagueClient.exe"),
  ].filter(Boolean);
}

function getRiotClientPathsFromInstalls() {
  // Riot writes the canonical RiotClientServices location here. This is the most
  // reliable source and is what LCU connector tools rely on.
  try {
    const programData = process.env.ProgramData ?? "C:\\ProgramData";
    const installsPath = path.join(programData, "Riot Games", "RiotClientInstalls.json");
    if (!fs.existsSync(installsPath)) return [];
    const data = JSON.parse(fs.readFileSync(installsPath, "utf8"));
    return [data.rc_default, data.rc_live, data.rc_beta].filter(Boolean);
  } catch {
    return [];
  }
}

function getPossibleRiotClientPaths() {
  const systemDrive = process.env.SystemDrive ?? "C:";
  const config = readConfig();
  const savedLeagueFolder = config.leagueFolderPath;
  const configuredRiotExe = process.env.RIOT_CLIENT_EXE_PATH;
  const commonDrives =
    process.platform === "win32" ? [systemDrive, "C:", "D:", "E:", "F:"] : [systemDrive];
  const uniqueDrives = [...new Set(commonDrives.filter(Boolean))];

  // If the user picked their League folder (…\Riot Games\League of Legends),
  // RiotClientServices sits next to it at …\Riot Games\Riot Client\…
  const derivedFromLeagueFolder = savedLeagueFolder
    ? path.join(
        path.dirname(savedLeagueFolder),
        "Riot Client",
        "RiotClientServices.exe",
      )
    : null;

  return [
    configuredRiotExe,
    ...getRiotClientPathsFromInstalls(),
    derivedFromLeagueFolder,
    ...uniqueDrives.flatMap((drive) => [
      path.join(drive, "Riot Games", "Riot Client", "RiotClientServices.exe"),
      path.join(drive, "Program Files", "Riot Games", "Riot Client", "RiotClientServices.exe"),
      path.join(drive, "Program Files (x86)", "Riot Games", "Riot Client", "RiotClientServices.exe"),
    ]),
  ].filter(Boolean);
}

async function waitForLeagueConnection(timeoutMs = 45000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const status = readLeagueLockfile();

    if (status.connected) {
      return status;
    }

    await wait(1000);
  }

  return readLeagueLockfile();
}

async function launchLeagueClient() {
  const alreadyConnected = readLeagueLockfile();

  if (alreadyConnected.connected) {
    return {
      ...alreadyConnected,
      launched: false,
      launchMethod: "already_connected",
      message: "League client already connected",
    };
  }

  const executableCandidates = getPossibleLeagueClientPaths();
  const executablePath = executableCandidates.find((candidatePath) => fs.existsSync(candidatePath));
  const riotClientCandidates = getPossibleRiotClientPaths();
  const riotClientPath = riotClientCandidates.find((candidatePath) => fs.existsSync(candidatePath));
  let launchMethod = "none";

  try {
    if (riotClientPath) {
      // Preferred: modern League must be started via RiotClientServices, not by
      // launching LeagueClient.exe directly.
      const child = spawn(
        riotClientPath,
        ["--launch-product=league_of_legends", "--launch-patchline=live"],
        {
          cwd: path.dirname(riotClientPath),
          detached: true,
          stdio: "ignore",
          windowsHide: false,
        },
      );

      child.unref();
      launchMethod = "riot-client-services";
    } else if (executablePath) {
      // Legacy fallback: direct LeagueClient.exe (older installs).
      const child = spawn(executablePath, [], {
        cwd: path.dirname(executablePath),
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });

      child.unref();
      launchMethod = "league-client-exe";
    } else if (process.platform === "win32") {
      await shell.openExternal("riotclient://launch-product=league_of_legends&launch-patchline=live");
      launchMethod = "riot-client-protocol";
    } else {
      return {
        connected: false,
        status: "not_open",
        message: "League install path not found. Select your League folder first.",
        searchedPaths: executableCandidates,
        searchedExecutablePaths: [...riotClientCandidates, ...executableCandidates],
        launched: false,
        launchMethod,
      };
    }
  } catch (error) {
    return {
      connected: false,
      status: "not_open",
      message: error instanceof Error ? error.message : "Could not launch League client",
      searchedPaths: executableCandidates,
      searchedExecutablePaths: [...riotClientCandidates, ...executableCandidates],
      launched: false,
      launchMethod,
    };
  }

  const status = await waitForLeagueConnection();

  return {
    ...status,
    launched: true,
    launchMethod,
    executablePath: riotClientPath ?? executablePath,
    message: status.connected
      ? "League client launched and connected"
      : "League launched. Log in or select your League folder if it does not connect.",
    searchedExecutablePaths: [...riotClientCandidates, ...executableCandidates],
  };
}


function getLeagueConnection() {
  const searchedPaths = getPossibleLockfilePaths();
  const lockfilePath = searchedPaths.find((candidatePath) => fs.existsSync(candidatePath));

  if (!lockfilePath) {
    return {
      connected: false,
      status: "not_open",
      message: "League client not open",
      searchedPaths,
    };
  }

  const lockfile = fs.readFileSync(lockfilePath, "utf8").trim();
  const [name, pid, port, password, protocol] = lockfile.split(":");

  if (!name || !pid || !port || !password || !protocol) {
    return {
      connected: false,
      status: "invalid_lockfile",
      message: "League lockfile was found but could not be read",
      lockfilePath,
    };
  }

  return {
    connected: true,
    status: "connected",
    message: "League client connected",
    lockfilePath,
    pid,
    port,
    password,
    protocol,
  };
}

function readLeagueLockfile() {
  const connection = getLeagueConnection();

  if (!connection.connected) {
    return connection;
  }

  const { password: _password, ...safeConnection } = connection;
  return safeConnection;
}

async function riotFetch(url) {
  if (!RIOT_API_KEY) {
    throw new Error("Missing RIOT_API_KEY in .env");
  }

  const response = await fetch(url, {
    headers: {
      "X-Riot-Token": RIOT_API_KEY,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Riot API error ${response.status}: ${body}`);
  }

  return response.json();
}

function getLocalAccount(currentSummoner) {
  if (!currentSummoner) {
    return null;
  }

  const displayName = currentSummoner.displayName ?? "";
  const [displayGameName, displayTagLine] = displayName.includes("#")
    ? displayName.split("#")
    : [displayName, ""];

  return {
    puuid: currentSummoner.puuid ?? "",
    gameName: currentSummoner.gameName ?? displayGameName ?? "Player",
    tagLine: currentSummoner.tagLine ?? currentSummoner.gameTag ?? displayTagLine ?? "",
  };
}

function normalizeRankedEntry(entry, queueType) {
  if (!entry) {
    return null;
  }

  const tier = entry.tier ?? entry.rankedTier ?? entry.currentSeasonTier;
  const rank = entry.rank ?? entry.division ?? entry.rankedDivision ?? entry.currentSeasonDivision;
  const leaguePoints =
    entry.leaguePoints ?? entry.leaguePointsValue ?? entry.leaguePointsDelta ?? entry.lp ?? 0;
  const wins = entry.wins ?? entry.rankedWins ?? entry.currentSeasonWins ?? 0;
  const losses = entry.losses ?? entry.rankedLosses ?? entry.currentSeasonLosses ?? 0;

  if (!tier || !rank) {
    return null;
  }

  return {
    queueType: entry.queueType ?? entry.queue ?? queueType ?? "RANKED_SOLO_5x5",
    tier,
    rank,
    leaguePoints: Number(leaguePoints) || 0,
    wins: Number(wins) || 0,
    losses: Number(losses) || 0,
  };
}

function findSoloQueue(rankedStats) {
  if (!rankedStats) {
    return null;
  }

  const queueMap = rankedStats.queueMap ?? rankedStats.queuesByType ?? {};
  const mappedSoloQueue = normalizeRankedEntry(
    queueMap.RANKED_SOLO_5x5 ?? queueMap.RANKED_SOLO,
    "RANKED_SOLO_5x5",
  );

  if (mappedSoloQueue) {
    return mappedSoloQueue;
  }

  const queueArrays = [
    rankedStats.queues,
    rankedStats.rankedQueues,
    rankedStats.queueStats,
    Array.isArray(rankedStats) ? rankedStats : null,
  ].filter(Array.isArray);

  for (const queueArray of queueArrays) {
    const soloQueue = queueArray.find((entry) => {
      const type = String(entry.queueType ?? entry.queue ?? entry.queueName ?? "");
      return type === "RANKED_SOLO_5x5" || type.includes("SOLO");
    });
    const normalizedSoloQueue = normalizeRankedEntry(soloQueue, "RANKED_SOLO_5x5");

    if (normalizedSoloQueue) {
      return normalizedSoloQueue;
    }
  }

  return null;
}

async function getLocalRankedProfile() {
  const currentSummoner = await lcuFetch("/lol-summoner/v1/current-summoner");
  const account = getLocalAccount(currentSummoner);

  if (!account) {
    throw new Error("League account is not available");
  }

  const rankedStats = await lcuFetch("/lol-ranked/v1/current-ranked-stats").catch(() =>
    account.puuid
      ? lcuFetch(`/lol-ranked/v1/ranked-stats/${encodeURIComponent(account.puuid)}`)
      : null,
  );

  return {
    account,
    soloQueue: findSoloQueue(rankedStats),
    source: "league-client",
  };
}

async function getRiotApiAccount() {
  if (!RIOT_GAME_NAME || !RIOT_TAG_LINE) {
    throw new Error("Missing RIOT_GAME_NAME or RIOT_TAG_LINE in .env");
  }

  return riotFetch(
    `https://${ACCOUNT_REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      RIOT_GAME_NAME,
    )}/${encodeURIComponent(RIOT_TAG_LINE)}`,
  );
}

async function getRiotApiRankedProfile() {
  const account = await getRiotApiAccount();

  const rankedEntries = await riotFetch(
    `https://${PLATFORM_REGION}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(
      account.puuid,
    )}`,
  );

  const soloQueue =
    rankedEntries.find((entry) => entry.queueType === "RANKED_SOLO_5x5") ?? null;

  return {
    account,
    soloQueue,
    source: "riot-api",
  };
}

function lcuFetch(endpoint, options = {}) {
  const connection = getLeagueConnection();

  if (!connection.connected) {
    throw new Error(connection.message);
  }

  const body = options.body ? JSON.stringify(options.body) : undefined;
  const authToken = Buffer.from(`riot:${connection.password}`).toString("base64");

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "127.0.0.1",
        port: Number(connection.port),
        path: endpoint,
        method: options.method ?? "GET",
        rejectUnauthorized: false,
        headers: {
          Authorization: `Basic ${authToken}`,
          "Content-Type": "application/json",
          ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
        },
      },
      (response) => {
        let responseBody = "";

        response.on("data", (chunk) => {
          responseBody += chunk;
        });

        response.on("end", () => {
          if (!response.statusCode || response.statusCode >= 400) {
            reject(
              new Error(
                `League client API error ${response.statusCode}: ${responseBody}`,
              ),
            );
            return;
          }

          if (!responseBody) {
            resolve(null);
            return;
          }

          try {
            resolve(JSON.parse(responseBody));
          } catch {
            resolve(responseBody);
          }
        });
      },
    );

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

function lcuFetchBuffer(endpoint) {
  const connection = getLeagueConnection();

  if (!connection.connected) {
    throw new Error(connection.message);
  }

  const authToken = Buffer.from(`riot:${connection.password}`).toString("base64");

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "127.0.0.1",
        port: Number(connection.port),
        path: endpoint,
        method: "GET",
        rejectUnauthorized: false,
        headers: {
          Authorization: `Basic ${authToken}`,
        },
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(chunk);
        });

        response.on("end", () => {
          const buffer = Buffer.concat(chunks);

          if (!response.statusCode || response.statusCode >= 400) {
            reject(
              new Error(
                `League client asset error ${response.statusCode}: ${buffer.toString("utf8")}`,
              ),
            );
            return;
          }

          resolve(buffer);
        });
      },
    );

    request.on("error", reject);
    request.end();
  });
}

// ----- asset cache (memory + disk) -----
const ASSET_MEMORY_CACHE = new Map();
const ASSET_MEMORY_CACHE_MAX = 500;
const ASSET_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
let assetCacheDir = null;

function getAssetCacheDir() {
  if (assetCacheDir) return assetCacheDir;
  assetCacheDir = path.join(app.getPath("userData"), "asset-cache");
  try {
    fs.mkdirSync(assetCacheDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create asset cache dir", error);
  }
  return assetCacheDir;
}

function memoryCacheSet(key, buffer) {
  ASSET_MEMORY_CACHE.set(key, buffer);
  if (ASSET_MEMORY_CACHE.size > ASSET_MEMORY_CACHE_MAX) {
    const oldest = ASSET_MEMORY_CACHE.keys().next().value;
    ASSET_MEMORY_CACHE.delete(oldest);
  }
}

async function readCachedBuffer(key) {
  const fromMemory = ASSET_MEMORY_CACHE.get(key);
  if (fromMemory) return fromMemory;
  try {
    const file = path.join(getAssetCacheDir(), key);
    const stat = await fs.promises.stat(file);
    if (Date.now() - stat.mtimeMs > ASSET_CACHE_TTL_MS) return null; // stale → refetch
    const buffer = await fs.promises.readFile(file);
    memoryCacheSet(key, buffer);
    return buffer;
  } catch {
    return null;
  }
}

async function writeCachedBuffer(key, buffer) {
  memoryCacheSet(key, buffer);
  try {
    await fs.promises.writeFile(path.join(getAssetCacheDir(), key), buffer);
  } catch (error) {
    console.error("Failed to write asset cache", error);
  }
}

// Serve an asset from cache, or fetch it from the LCU once and cache it.
async function serveCachedAsset(cacheKey, contentType, lcuPath) {
  let buffer = await readCachedBuffer(cacheKey);
  let cacheState = "hit";
  if (!buffer) {
    buffer = await lcuFetchBuffer(lcuPath);
    cacheState = "miss";
    if (buffer && buffer.length > 0) await writeCachedBuffer(cacheKey, buffer);
  }
  if (!buffer || buffer.length === 0) {
    return new Response(null, { status: 404 });
  }
  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=604800",
      "X-Bonk-Cache": cacheState,
    },
  });
}

function clearAssetCache() {
  ASSET_MEMORY_CACHE.clear();
  try {
    const dir = getAssetCacheDir();
    for (const file of fs.readdirSync(dir)) {
      try {
        fs.unlinkSync(path.join(dir, file));
      } catch {
        // ignore individual file errors
      }
    }
    return true;
  } catch (error) {
    console.error("Failed to clear asset cache", error);
    return false;
  }
}

function registerLcuAssetProtocol() {
  protocol.handle("bonk-lcu", async (request) => {
    try {
      const requestUrl = new URL(request.url);
      const host = requestUrl.hostname;

      // General passthrough for LCU game-data assets (rune/perk/spell icons, etc).
      // Usage: bonk-lcu://lcu-asset/?path=/lol-game-data/assets/v1/perk-images/...
      if (host === "lcu-asset") {
        const assetPath = requestUrl.searchParams.get("path") || "";
        if (!assetPath.startsWith("/lol-game-data/assets/")) {
          return new Response(null, { status: 404 });
        }
        const lower = assetPath.toLowerCase();
        const contentType =
          lower.endsWith(".jpg") || lower.endsWith(".jpeg")
            ? "image/jpeg"
            : lower.endsWith(".webp")
              ? "image/webp"
              : "image/png";
        const ext = contentType === "image/jpeg" ? ".jpg" : contentType === "image/webp" ? ".webp" : ".png";
        const key = `asset-${crypto.createHash("sha1").update(assetPath).digest("hex")}${ext}`;
        return await serveCachedAsset(key, contentType, assetPath);
      }

      if (host === "champion-icons") {
        const championId = Number(path.basename(requestUrl.pathname).replace(".png", ""));
        if (!Number.isInteger(championId) || championId <= 0) {
          return new Response(null, { status: 404 });
        }
        return await serveCachedAsset(
          `champ-${championId}.png`,
          "image/png",
          `/lol-game-data/assets/v1/champion-icons/${championId}.png`,
        );
      }

      if (host === "champion-splashes") {
        const splashPath = requestUrl.pathname.replace(/^\/+/, "");
        const [championId, splashFile] = splashPath.split("/");
        const parsedChampionId = Number(championId);
        if (!Number.isInteger(parsedChampionId) || !splashFile?.endsWith(".jpg")) {
          return new Response(null, { status: 404 });
        }
        return await serveCachedAsset(
          `splash-${parsedChampionId}-${splashFile}`,
          "image/jpeg",
          `/lol-game-data/assets/v1/champion-splashes/${parsedChampionId}/${splashFile}`,
        );
      }

      return new Response(null, { status: 404 });
    } catch (error) {
      console.error(error);
      return new Response(null, { status: 500 });
    }
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: "#07111d",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// Recommended pages use a different schema than saved pages
// (primaryPerkStyleId / secondaryPerkStyleId / perks). Normalize so the UI can
// treat them like a regular rune page.
function normalizeRecommendedPage(page, index) {
  const perks = Array.isArray(page?.perks)
    ? page.perks.map((perk) => (typeof perk === "object" ? Number(perk?.id ?? perk?.perkId) : Number(perk)))
    : Array.isArray(page?.selectedPerkIds)
      ? page.selectedPerkIds.map(Number)
      : [];

  return {
    id: -(index + 1), // synthetic negative id — never collides with saved pages
    name: page?.name || `Recommended ${index + 1}`,
    primaryStyleId: Number(page?.primaryPerkStyleId ?? page?.primaryStyleId ?? 0),
    subStyleId: Number(page?.secondaryPerkStyleId ?? page?.subStyleId ?? 0),
    selectedPerkIds: perks.filter((id) => Number.isInteger(id) && id > 0),
    current: false,
    isEditable: true,
  };
}

async function getLeagueOverview() {
  const status = readLeagueLockfile();

  if (!status.connected) {
    return {
      status,
      currentSummoner: null,
      friends: [],
      lobby: null,
      gameQueues: [],
      readyCheck: null,
      matchmakingSearch: null,
      champSelect: null,
      gameflowPhase: null,
      honorBallot: null,
    };
  }

  const [
    currentSummoner,
    friends,
    lobby,
    gameQueues,
    readyCheck,
    matchmakingSearch,
    champSelectSession,
    pickableChampionIds,
    bannableChampionIds,
    championSummary,
    runePages,
    currentRunePage,
    perkStyles,
    summonerSpells,
    recommendedRunePages,
    perks,
    skinCarousel,
    gameflowPhase,
    honorBallot,
  ] = await Promise.all([
    lcuFetch("/lol-summoner/v1/current-summoner").catch(() => null),
    lcuFetch("/lol-chat/v1/friends").catch(() => []),
    lcuFetch("/lol-lobby/v2/lobby").catch(() => null),
    lcuFetch("/lol-game-queues/v1/queues").catch(() => []),
    lcuFetch("/lol-matchmaking/v1/ready-check").catch(() => null),
    lcuFetch("/lol-matchmaking/v1/search")
      .catch(() => lcuFetch("/lol-lobby/v2/lobby/matchmaking/search"))
      .catch(() => null),
    lcuFetch("/lol-champ-select/v1/session").catch(() => null),
    lcuFetch("/lol-champ-select/v1/pickable-champion-ids").catch(() => []),
    lcuFetch("/lol-champ-select/v1/bannable-champion-ids").catch(() => []),
    lcuFetch("/lol-game-data/assets/v1/champion-summary.json").catch(() => []),
    lcuFetch("/lol-perks/v1/pages").catch(() => []),
    lcuFetch("/lol-perks/v1/currentpage").catch(() => null),
    lcuFetch("/lol-perks/v1/styles").catch(() => []),
    lcuFetch("/lol-game-data/assets/v1/summoner-spells.json").catch(() => []),
    lcuFetch("/lol-perks/v1/recommended-pages").catch(() => []),
    lcuFetch("/lol-perks/v1/perks").catch(() => []),
    lcuFetch("/lol-champ-select/v1/skin-carousel-skins").catch(() => []),
    lcuFetch("/lol-gameflow/v1/gameflow-phase").catch(() => null),
    lcuFetch("/lol-honor-v2/v1/ballot").catch(() => null),
  ]);

  return {
    status,
    currentSummoner,
    friends: Array.isArray(friends) ? friends : [],
    lobby,
    gameQueues: Array.isArray(gameQueues) ? gameQueues : [],
    readyCheck,
    matchmakingSearch,
    champSelect: champSelectSession
      ? {
          session: champSelectSession,
          pickableChampionIds: Array.isArray(pickableChampionIds) ? pickableChampionIds : [],
          bannableChampionIds: Array.isArray(bannableChampionIds) ? bannableChampionIds : [],
          champions: Array.isArray(championSummary) ? championSummary : [],
          runePages: Array.isArray(runePages) ? runePages : [],
          currentRunePage,
          perkStyles: Array.isArray(perkStyles) ? perkStyles : [],
          summonerSpells: Array.isArray(summonerSpells) ? summonerSpells : [],
          recommendedRunePages: (Array.isArray(recommendedRunePages) ? recommendedRunePages : []).map(
            normalizeRecommendedPage,
          ),
          perks: Array.isArray(perks) ? perks : [],
          skinCarousel: Array.isArray(skinCarousel) ? skinCarousel : [],
        }
      : null,
    gameflowPhase: typeof gameflowPhase === "string" ? gameflowPhase : gameflowPhase || null,
    honorBallot: honorBallot
      ? {
          gameId: honorBallot.gameId,
          players: (honorBallot.eligibleAllies || honorBallot.eligiblePlayers || [])
            .map((player) => ({
              summonerId: Number(player.summonerId) || 0,
              puuid: player.puuid || "",
              name: player.summonerName || player.gameName || "Player",
              championId: Number(player.championId || player.skinSplashPath?.championId) || 0,
              position: player.position || "",
              botPlayer: Boolean(player.botPlayer),
            }))
            .filter((player) => player.summonerId > 0 && !player.botPlayer),
        }
      : null,
  };
}

async function createLobby(queueId) {
  await lcuFetch("/lol-lobby/v2/lobby", {
    method: "POST",
    body: {
      queueId,
    },
  });
}

async function switchLobbyQueue(queueId) {
  const lobby = await lcuFetch("/lol-lobby/v2/lobby").catch(() => null);

  if (!lobby) {
    await createLobby(queueId);
    return;
  }

  if (lobby?.gameConfig?.queueId === queueId) {
    return;
  }

  const switchAttempts = [
    { queueId },
    { id: queueId },
    queueId,
  ];

  for (const body of switchAttempts) {
    try {
      await lcuFetch("/lol-lobby/v1/parties/queue", {
        method: "PUT",
        body,
      });
      return;
    } catch {
      // Try the next known body shape before falling back.
    }
  }

  const memberCount = Array.isArray(lobby.members) ? lobby.members.length : 1;

  if (memberCount > 1) {
    throw new Error("Could not switch queue while in a party");
  }

  await lcuFetch("/lol-lobby/v2/lobby", {
    method: "DELETE",
  });
  await createLobby(queueId);
}

async function inviteSummonersToLobby(summonerIds, queueId) {
  const ids = (Array.isArray(summonerIds) ? summonerIds : [summonerIds])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (ids.length === 0) {
    throw new Error("No valid summoner IDs to invite");
  }

  // Inviting requires an active lobby — create one if needed.
  const lobby = await lcuFetch("/lol-lobby/v2/lobby").catch(() => null);
  if (!lobby) {
    const fallbackQueueId = Number(queueId);
    await createLobby(Number.isInteger(fallbackQueueId) ? fallbackQueueId : 420);
  }

  await lcuFetch("/lol-lobby/v2/lobby/invitations", {
    method: "POST",
    body: ids.map((toSummonerId) => ({ toSummonerId })),
  });
}

ipcMain.handle("riot:get-account", async () => {
  const currentSummoner = await lcuFetch("/lol-summoner/v1/current-summoner").catch(() => null);
  const localAccount = getLocalAccount(currentSummoner);

  if (localAccount) {
    return localAccount;
  }

  if (RIOT_API_KEY && RIOT_GAME_NAME && RIOT_TAG_LINE) {
    return getRiotApiAccount();
  }

  throw new Error("Open League client to load account");
});

ipcMain.handle("riot:get-ranked-profile", async () => {
  const localProfile = await getLocalRankedProfile().catch(() => null);

  if (localProfile) {
    return localProfile;
  }

  if (RIOT_API_KEY && RIOT_GAME_NAME && RIOT_TAG_LINE) {
    return getRiotApiRankedProfile();
  }

  throw new Error("Open League client to load rank");
});

ipcMain.handle("league:launch-client", async () => {
  return launchLeagueClient();
});

ipcMain.handle("league:get-client-status", async () => {
  return readLeagueLockfile();
});

ipcMain.handle("league:get-overview", async () => {
  return getLeagueOverview();
});

ipcMain.handle("league:create-lobby", async (_event, queueId) => {
  const parsedQueueId = Number(queueId);

  if (!Number.isInteger(parsedQueueId)) {
    throw new Error("Queue ID must be a number");
  }

  await switchLobbyQueue(parsedQueueId);

  return getLeagueOverview();
});

ipcMain.handle("league:start-matchmaking", async () => {
  await lcuFetch("/lol-lobby/v2/lobby/matchmaking/search", {
    method: "POST",
  });

  return getLeagueOverview();
});

ipcMain.handle("league:cancel-matchmaking", async () => {
  await lcuFetch("/lol-lobby/v2/lobby/matchmaking/search", {
    method: "DELETE",
  });

  return getLeagueOverview();
});

ipcMain.handle("league:set-role-preferences", async (_event, firstPreference, secondPreference) => {
  await lcuFetch("/lol-lobby/v2/lobby/members/localMember/position-preferences", {
    method: "PUT",
    body: {
      firstPreference,
      secondPreference,
    },
  });

  return getLeagueOverview();
});

ipcMain.handle("league:invite-to-lobby", async (_event, summonerIds, queueId) => {
  await inviteSummonersToLobby(summonerIds, queueId);
  return getLeagueOverview();
});

ipcMain.handle("league:champ-select-action", async (_event, actionId, body) => {
  const parsedActionId = Number(actionId);
  const championId = Number(body?.championId);
  const completed = Boolean(body?.completed);

  if (!Number.isInteger(parsedActionId)) {
    throw new Error("Champ select action ID must be a number");
  }

  if (!Number.isInteger(championId) || championId <= 0) {
    throw new Error("Champion ID must be a valid number");
  }

  await lcuFetch(`/lol-champ-select/v1/session/actions/${parsedActionId}`, {
    method: "PATCH",
    body: {
      championId,
      completed: false,
    },
  });

  if (completed) {
    await wait(120);
    await lcuFetch(`/lol-champ-select/v1/session/actions/${parsedActionId}`, {
      method: "PATCH",
      body: {
        championId,
        completed: true,
      },
    });
  }

  return getLeagueOverview();
});

ipcMain.handle("league:select-rune-page", async (_event, pageId) => {
  const parsedPageId = Number(pageId);

  if (!Number.isInteger(parsedPageId)) {
    throw new Error("Rune page ID must be a number");
  }

  const runePages = await lcuFetch("/lol-perks/v1/pages").catch(() => []);
  const page = Array.isArray(runePages)
    ? runePages.find((runePage) => Number(runePage.id) === parsedPageId)
    : null;

  if (!page) {
    throw new Error("Rune page not found");
  }

  await lcuFetch(`/lol-perks/v1/pages/${parsedPageId}`, {
    method: "PUT",
    body: {
      ...page,
      current: true,
    },
  });

  return getLeagueOverview();
});

ipcMain.handle("league:set-skin", async (_event, selectedSkinId) => {
  const skinId = Number(selectedSkinId);
  if (!Number.isInteger(skinId) || skinId <= 0) {
    throw new Error("A valid skin ID is required");
  }
  await lcuFetch("/lol-champ-select/v1/session/my-selection", {
    method: "PATCH",
    body: { selectedSkinId: skinId },
  });
  return getLeagueOverview();
});

ipcMain.handle("league:set-summoner-spells", async (_event, spell1Id, spell2Id) => {
  const first = Number(spell1Id);
  const second = Number(spell2Id);

  if (!Number.isInteger(first) || !Number.isInteger(second)) {
    throw new Error("Summoner spell IDs must be numbers");
  }

  await lcuFetch("/lol-champ-select/v1/session/my-selection", {
    method: "PATCH",
    body: {
      spell1Id: first,
      spell2Id: second,
    },
  });

  return getLeagueOverview();
});

ipcMain.handle("league:apply-rune-page", async (_event, page) => {
  if (!page || typeof page !== "object") {
    throw new Error("A rune page is required");
  }

  // Build a fresh editable page from the recommended/selected one and make it current.
  const newPage = {
    name: page.name || "BONK Recommended",
    primaryStyleId: page.primaryStyleId,
    subStyleId: page.subStyleId,
    selectedPerkIds: Array.isArray(page.selectedPerkIds) ? page.selectedPerkIds : [],
    current: true,
  };

  // Free a slot if the player is at the page limit by deleting an editable page.
  const existingPages = await lcuFetch("/lol-perks/v1/pages").catch(() => []);
  const inventory = await lcuFetch("/lol-perks/v1/inventory").catch(() => null);
  const maxPages = Number(inventory?.ownedPageCount) || 2;

  if (Array.isArray(existingPages) && existingPages.length >= maxPages) {
    const deletable = existingPages.find((existing) => existing.isDeletable !== false);
    if (deletable) {
      await lcuFetch(`/lol-perks/v1/pages/${deletable.id}`, { method: "DELETE" }).catch(() => {});
    }
  }

  await lcuFetch("/lol-perks/v1/pages", {
    method: "POST",
    body: newPage,
  });

  return getLeagueOverview();
});

ipcMain.handle("league:save-rune-page", async (_event, page) => {
  if (!page || typeof page !== "object") {
    throw new Error("A rune page is required");
  }

  const body = {
    name: page.name || "BONK Custom",
    primaryStyleId: Number(page.primaryStyleId),
    subStyleId: Number(page.subStyleId),
    selectedPerkIds: Array.isArray(page.selectedPerkIds)
      ? page.selectedPerkIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [],
    current: true,
  };

  const existingPages = await lcuFetch("/lol-perks/v1/pages").catch(() => []);
  const pageId = Number(page.id);
  const existing =
    Number.isInteger(pageId) && pageId > 0 && Array.isArray(existingPages)
      ? existingPages.find((existingPage) => Number(existingPage.id) === pageId)
      : null;

  if (existing && existing.isEditable !== false) {
    // Update the existing editable page in place.
    await lcuFetch(`/lol-perks/v1/pages/${pageId}`, {
      method: "PUT",
      body: { ...body, id: pageId },
    });
  } else {
    // Create a new page, freeing a slot first if at the page cap.
    const inventory = await lcuFetch("/lol-perks/v1/inventory").catch(() => null);
    const maxPages = Number(inventory?.ownedPageCount) || 2;
    if (Array.isArray(existingPages) && existingPages.length >= maxPages) {
      const deletable = existingPages.find((existingPage) => existingPage.isDeletable !== false);
      if (deletable) {
        await lcuFetch(`/lol-perks/v1/pages/${deletable.id}`, { method: "DELETE" }).catch(() => {});
      }
    }
    await lcuFetch("/lol-perks/v1/pages", { method: "POST", body });
  }

  return getLeagueOverview();
});

let itemIconMapCache = null;
async function getItemIconMap() {
  if (itemIconMapCache) return itemIconMapCache;
  const items = await lcuFetch("/lol-game-data/assets/v1/items.json").catch(() => []);
  itemIconMapCache = new Map(
    (Array.isArray(items) ? items : []).map((item) => [Number(item.id), item.iconPath]),
  );
  return itemIconMapCache;
}

ipcMain.handle("league:honor-player", async (_event, summonerId) => {
  const id = Number(summonerId);
  // summonerId 0 means "honor no one" — skip the ballot.
  await lcuFetch("/lol-honor-v2/v1/honor", {
    method: "POST",
    body: id > 0 ? { summonerId: id, honorCategory: "HEART" } : {},
  }).catch(() => {});
  return getLeagueOverview();
});

ipcMain.handle("league:get-store", async () => {
  const [catalog, wallet, championSummary, skinsCatalog] = await Promise.all([
    lcuFetch("/lol-store/v1/catalog").catch(() => []),
    lcuFetch("/lol-inventory/v1/wallet").catch(() =>
      lcuFetch("/lol-store/v1/wallet").catch(() => null),
    ),
    lcuFetch("/lol-game-data/assets/v1/champion-summary.json").catch(() => []),
    lcuFetch("/lol-game-data/assets/v1/skins.json").catch(() => ({})),
  ]);

  const entries = Array.isArray(catalog) ? catalog : [];

  const priceFor = (entry, currencies) => {
    const prices = entry.prices ?? [];
    for (const currency of currencies) {
      const match = prices.find(
        (price) => price.currency === currency || price.costType === currency,
      );
      if (match) return Number(match.cost) || 0;
    }
    return null;
  };
  const saleFor = (entry) => {
    const sale = (entry.prices ?? []).find((price) => price.discount && price.discount > 0);
    if (!sale) return null;
    return { cost: Number(sale.cost) || 0, currency: sale.currency };
  };

  // Store catalog tells us what's purchasable + prices, keyed by item id.
  const championCatalog = new Map();
  const skinCatalog = new Map();
  for (const entry of entries) {
    const id = Number(entry.itemId);
    if (!Number.isInteger(id)) continue;
    if (entry.inventoryType === "CHAMPION") championCatalog.set(id, entry);
    else if (entry.inventoryType === "CHAMPION_SKIN") skinCatalog.set(id, entry);
  }

  // Names/icons come from the asset catalogs (the store catalog omits them).
  const champions = (Array.isArray(championSummary) ? championSummary : [])
    .filter((champ) => Number(champ.id) > 0 && championCatalog.has(Number(champ.id)))
    .map((champ) => {
      const entry = championCatalog.get(Number(champ.id));
      return {
        id: Number(champ.id),
        championId: Number(champ.id),
        name: champ.name || "",
        tilePath: null,
        rp: priceFor(entry, ["RP"]),
        be: priceFor(entry, ["lol_blue_essence", "BLUE_ESSENCE", "IP"]),
        sale: saleFor(entry),
      };
    })
    .filter((champ) => champ.name);

  const skinValues =
    skinsCatalog && typeof skinsCatalog === "object" ? Object.values(skinsCatalog) : [];
  const skins = skinValues
    .filter((skin) => !skin.isBase && skinCatalog.has(Number(skin.id)))
    .map((skin) => {
      const entry = skinCatalog.get(Number(skin.id));
      return {
        id: Number(skin.id),
        championId: Math.floor(Number(skin.id) / 1000),
        name: skin.name || "",
        tilePath: skin.tilePath || skin.splashPath || null,
        rp: priceFor(entry, ["RP"]),
        be: null,
        sale: saleFor(entry),
      };
    })
    .filter((skin) => skin.name);

  const walletObj = wallet || {};
  const rp = Number(walletObj.rp ?? walletObj.RP ?? 0) || 0;
  const be =
    Number(
      walletObj.lol_blue_essence ?? walletObj.ip ?? walletObj.blueEssence ?? walletObj.IP ?? 0,
    ) || 0;

  return { champions, skins, wallet: { rp, be } };
});

ipcMain.handle("league:get-match-detail", async (_event, gameId) => {
  const id = Number(gameId);
  if (!Number.isInteger(id) || id <= 0) return null;

  const [game, me, itemIcons] = await Promise.all([
    lcuFetch(`/lol-match-history/v1/games/${id}`).catch(() => null),
    lcuFetch("/lol-summoner/v1/current-summoner").catch(() => null),
    getItemIconMap(),
  ]);
  if (!game) return null;

  const myPuuid = me?.puuid;
  const identities = new Map(
    (game.participantIdentities ?? []).map((entry) => [entry.participantId, entry.player ?? {}]),
  );
  const teamWin = new Map(
    (game.teams ?? []).map((team) => [
      Number(team.teamId),
      team.win === "Win" || team.win === true,
    ]),
  );

  const players = (game.participants ?? []).map((participant) => {
    const stats = participant.stats ?? {};
    const identity = identities.get(participant.participantId) ?? {};
    const items = [
      stats.item0,
      stats.item1,
      stats.item2,
      stats.item3,
      stats.item4,
      stats.item5,
      stats.item6,
    ]
      .map(Number)
      .filter((itemId) => Number.isInteger(itemId) && itemId > 0)
      .map((itemId) => ({ id: itemId, iconPath: itemIcons.get(itemId) || null }));

    return {
      teamId: Number(participant.teamId),
      championId: Number(participant.championId) || 0,
      name: identity.gameName || identity.summonerName || "Player",
      tagLine: identity.tagLine || "",
      isLocal: Boolean(myPuuid && identity.puuid === myPuuid),
      kills: Number(stats.kills) || 0,
      deaths: Number(stats.deaths) || 0,
      assists: Number(stats.assists) || 0,
      cs: (Number(stats.totalMinionsKilled) || 0) + (Number(stats.neutralMinionsKilled) || 0),
      gold: Number(stats.goldEarned) || 0,
      damage: Number(stats.totalDamageDealtToChampions) || 0,
      champLevel: Number(stats.champLevel) || 0,
      spell1Id: Number(participant.spell1Id) || 0,
      spell2Id: Number(participant.spell2Id) || 0,
      items,
    };
  });

  const localPlayer = players.find((player) => player.isLocal);
  const myTeamId = localPlayer?.teamId ?? 100;
  const enemyTeamId = myTeamId === 100 ? 200 : 100;

  return {
    gameId: game.gameId,
    gameDuration: game.gameDuration,
    queueId: game.queueId,
    allyTeam: {
      players: players.filter((player) => player.teamId === myTeamId),
      win: teamWin.get(myTeamId) ?? false,
    },
    enemyTeam: {
      players: players.filter((player) => player.teamId === enemyTeamId),
      win: teamWin.get(enemyTeamId) ?? false,
    },
  };
});

ipcMain.handle("league:get-profile", async () => {
  const summoner = await lcuFetch("/lol-summoner/v1/current-summoner").catch(() => null);
  const summonerId = summoner?.summonerId;

  const [ranked, masteryRaw, matchHistory, iconInventory, itemIconById] = await Promise.all([
    lcuFetch("/lol-ranked/v1/current-ranked-stats").catch(() => null),
    lcuFetch("/lol-champion-mastery/v1/local-player/champion-mastery").catch(() =>
      summonerId
        ? lcuFetch(`/lol-champion-mastery/v1/${summonerId}/champion-mastery`).catch(() => [])
        : [],
    ),
    lcuFetch(
      "/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=15",
    ).catch(() => null),
    lcuFetch('/lol-inventory/v1/inventory?inventoryTypes=["SUMMONER_ICON"]').catch(() => []),
    getItemIconMap(),
  ]);

  const queueMap = ranked?.queueMap ?? {};
  const queuesArray = Array.isArray(ranked?.queues) ? ranked.queues : [];
  const rankForQueue = (type) => {
    const queue =
      queueMap[type] || queuesArray.find((entry) => entry.queueType === type) || null;
    if (!queue) return null;
    return {
      tier: queue.tier || "UNRANKED",
      division: queue.division && queue.division !== "NA" ? queue.division : "",
      leaguePoints: Number(queue.leaguePoints) || 0,
      wins: Number(queue.wins) || 0,
      losses: Number(queue.losses) || 0,
    };
  };

  const mastery = (Array.isArray(masteryRaw) ? masteryRaw : [])
    .slice()
    .sort((a, b) => (b.championPoints || 0) - (a.championPoints || 0))
    .slice(0, 12)
    .map((entry) => ({
      championId: Number(entry.championId),
      level: Number(entry.championLevel) || 0,
      points: Number(entry.championPoints) || 0,
    }));

  const games = matchHistory?.games?.games ?? [];
  const matches = games.map((game) => {
    const participant = game.participants?.[0] ?? {};
    const stats = participant.stats ?? {};
    const items = [
      stats.item0,
      stats.item1,
      stats.item2,
      stats.item3,
      stats.item4,
      stats.item5,
      stats.item6,
    ]
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0)
      .map((id) => ({ id, iconPath: itemIconById.get(id) || null }));

    return {
      gameId: game.gameId,
      queueId: game.queueId,
      gameMode: game.gameMode,
      gameCreation: game.gameCreation,
      gameDuration: game.gameDuration,
      championId: Number(participant.championId) || 0,
      win: Boolean(stats.win),
      kills: Number(stats.kills) || 0,
      deaths: Number(stats.deaths) || 0,
      assists: Number(stats.assists) || 0,
      cs: (Number(stats.totalMinionsKilled) || 0) + (Number(stats.neutralMinionsKilled) || 0),
      champLevel: Number(stats.champLevel) || 0,
      gold: Number(stats.goldEarned) || 0,
      damage: Number(stats.totalDamageDealtToChampions) || 0,
      damageTaken: Number(stats.totalDamageTaken) || 0,
      visionScore: Number(stats.visionScore) || 0,
      wardsPlaced: Number(stats.wardsPlaced) || 0,
      largestMultiKill: Number(stats.largestMultiKill) || 0,
      items,
    };
  });

  const ownedIconIds = (Array.isArray(iconInventory) ? iconInventory : [])
    .map((item) => Number(item.itemId))
    .filter((id) => Number.isInteger(id) && id >= 0);

  return {
    summoner,
    rankedSolo: rankForQueue("RANKED_SOLO_5x5"),
    rankedFlex: rankForQueue("RANKED_FLEX_SR"),
    mastery,
    matches,
    ownedIconIds,
  };
});

ipcMain.handle("league:set-profile-icon", async (_event, iconId) => {
  const profileIconId = Number(iconId);
  if (!Number.isInteger(profileIconId) || profileIconId < 0) {
    throw new Error("A valid icon ID is required");
  }
  await lcuFetch("/lol-summoner/v1/current-summoner/icon", {
    method: "PUT",
    body: { profileIconId },
  });
  return getLeagueOverview();
});

ipcMain.handle("league:get-collection", async () => {
  const summoner = await lcuFetch("/lol-summoner/v1/current-summoner").catch(() => null);
  const summonerId = summoner?.summonerId;

  const [championsMinimal, skinsCatalog, skinsOwnership] = await Promise.all([
    summonerId
      ? lcuFetch(`/lol-champions/v1/inventories/${summonerId}/champions-minimal`).catch(() => [])
      : lcuFetch("/lol-champions/v1/owned-champions-minimal").catch(() => []),
    lcuFetch("/lol-game-data/assets/v1/skins.json").catch(() => ({})),
    summonerId
      ? lcuFetch(`/lol-champions/v1/inventories/${summonerId}/skins-minimal`).catch(() => [])
      : Promise.resolve([]),
  ]);

  const ownedSkinIds = new Set(
    (Array.isArray(skinsOwnership) ? skinsOwnership : [])
      .filter((skin) => skin?.ownership?.owned)
      .map((skin) => Number(skin.id)),
  );

  const champions = (Array.isArray(championsMinimal) ? championsMinimal : [])
    .map((champ) => ({
      id: Number(champ.id),
      name: champ.name,
      alias: champ.alias,
      squarePortraitPath: champ.squarePortraitPath,
      roles: Array.isArray(champ.roles) ? champ.roles : [],
      owned: Boolean(champ.ownership?.owned ?? champ.owned),
    }))
    .filter((champ) => champ.id > 0);

  const skinValues =
    skinsCatalog && typeof skinsCatalog === "object" ? Object.values(skinsCatalog) : [];
  const skins = skinValues
    .map((skin) => ({
      id: Number(skin.id),
      championId: Math.floor(Number(skin.id) / 1000),
      name: skin.name,
      tilePath: skin.tilePath,
      splashPath: skin.splashPath || skin.uncenteredSplashPath,
      isBase: Boolean(skin.isBase),
      rarity: skin.rarity || null,
      owned: ownedSkinIds.has(Number(skin.id)),
    }))
    .filter((skin) => skin.id > 0 && Number.isInteger(skin.championId) && skin.championId > 0);

  return { champions, skins };
});

ipcMain.handle("league:clear-asset-cache", async () => {
  return clearAssetCache();
});

ipcMain.handle("league:get-rune-data", async () => {
  const [styles, perks, recommended, spells] = await Promise.all([
    lcuFetch("/lol-perks/v1/styles").catch(() => []),
    lcuFetch("/lol-perks/v1/perks").catch(() => []),
    lcuFetch("/lol-perks/v1/recommended-pages").catch(() => []),
    lcuFetch("/lol-game-data/assets/v1/summoner-spells.json").catch(() => []),
  ]);
  return {
    perkStyles: Array.isArray(styles) ? styles : [],
    perks: Array.isArray(perks) ? perks : [],
    recommendedRunePages: (Array.isArray(recommended) ? recommended : []).map(
      normalizeRecommendedPage,
    ),
    summonerSpells: Array.isArray(spells) ? spells : [],
  };
});

ipcMain.handle("league:accept-ready-check", async () => {
  await lcuFetch("/lol-matchmaking/v1/ready-check/accept", {
    method: "POST",
  });

  return getLeagueOverview();
});

ipcMain.handle("league:decline-ready-check", async () => {
  await lcuFetch("/lol-matchmaking/v1/ready-check/decline", {
    method: "POST",
  });

  return getLeagueOverview();
});

ipcMain.handle("league:select-install-folder", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select your League of Legends folder",
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      selected: false,
      ...readLeagueLockfile(),
    };
  }

  const leagueFolderPath = result.filePaths[0];
  const config = readConfig();

  writeConfig({
    ...config,
    leagueFolderPath,
  });

  return {
    selected: true,
    leagueFolderPath,
    ...readLeagueLockfile(),
  };
});

ipcMain.handle("app:exit", () => {
  app.quit();
});

app.whenReady().then(() => {
  registerLcuAssetProtocol();
  createWindow();
  setupAutoUpdater();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
