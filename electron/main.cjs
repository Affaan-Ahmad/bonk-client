const { app, BrowserWindow, dialog, ipcMain, protocol, shell } = require("electron");
const { spawn } = require("child_process");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
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

function registerLcuAssetProtocol() {
  protocol.handle("bonk-lcu", async (request) => {
    try {
      const requestUrl = new URL(request.url);

      if (
        requestUrl.hostname !== "champion-icons" &&
        requestUrl.hostname !== "champion-splashes"
      ) {
        return new Response(null, { status: 404 });
      }

      if (requestUrl.hostname === "champion-icons") {
        const championId = Number(path.basename(requestUrl.pathname).replace(".png", ""));

        if (!Number.isInteger(championId) || championId <= 0) {
          return new Response(null, { status: 404 });
        }

        const buffer = await lcuFetchBuffer(
          `/lol-game-data/assets/v1/champion-icons/${championId}.png`,
        );

        return new Response(buffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }

      const splashPath = requestUrl.pathname.replace(/^\/+/, "");
      const [championId, splashFile] = splashPath.split("/");
      const parsedChampionId = Number(championId);

      if (!Number.isInteger(parsedChampionId) || !splashFile?.endsWith(".jpg")) {
        return new Response(null, { status: 404 });
      }

      const buffer = await lcuFetchBuffer(
        `/lol-game-data/assets/v1/champion-splashes/${parsedChampionId}/${splashFile}`,
      );

      return new Response(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=3600",
        },
      });
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
          recommendedRunePages: Array.isArray(recommendedRunePages) ? recommendedRunePages : [],
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
