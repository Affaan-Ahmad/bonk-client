import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type LobbySlot = {
  name: string;
  tag: string;
  role: string;
  rank: string;
  lp: string;
  status: "leader" | "ready" | "empty";
  accent: "gold" | "blue" | "teal" | "violet" | "empty";
  cardSkin: string;
};

type ModeCategory = "rift" | "aram" | "alternate" | "tft";

type QueueOption = {
  label: string;
  queueId: number;
  category: ModeCategory;
  note?: string;
  description: string;
  disabledReason?: string;
};

type FriendStatus = "Online" | "In Game" | "Away" | "Offline";
type RankedProfile = Awaited<ReturnType<Window["bonkClient"]["getRankedProfile"]>>;
type ChampionSummary = LeagueChampionSummary & { id: number; name: string };

const READY_CHECK_TOTAL_SECONDS = 10;
const navItems = ["Home", "Play", "Collection", "Profile", "Store", "Settings"] as const;
const roles = ["Top", "Jungle", "Mid", "Bot", "Support", "Fill"];
const cardSkins = [
  {
    id: "sunspire",
    name: "Sunspire",
    rarity: "Legendary",
    accent: "gold" as const,
    description: "Warm gold frame with a polished ranked look.",
  },
  {
    id: "bluefall",
    name: "Bluefall",
    rarity: "Epic",
    accent: "blue" as const,
    description: "Cool arcane frame with blue combat lighting.",
  },
  {
    id: "jadeguard",
    name: "Jadeguard",
    rarity: "Epic",
    accent: "teal" as const,
    description: "Clean teal frame for support and utility players.",
  },
  {
    id: "voidglass",
    name: "Voidglass",
    rarity: "Rare",
    accent: "violet" as const,
    description: "Dark violet frame with sharp edges.",
  },
] as const;

const modeCategories: { id: ModeCategory; eyebrow: string; title: string }[] = [
  { id: "rift", eyebrow: "5v5", title: "Summoner's Rift" },
  { id: "aram", eyebrow: "5v5", title: "ARAM" },
  { id: "alternate", eyebrow: "Rotating", title: "Alternate Modes" },
  { id: "tft", eyebrow: "FFA", title: "Teamfight Tactics" },
];

const queueOptions: QueueOption[] = [
  {
    label: "Swiftplay",
    queueId: 480,
    category: "rift",
    note: "Faster games",
    description: "Shorter Rift matches with quick combat pacing.",
  },
  {
    label: "Draft Pick",
    queueId: 400,
    category: "rift",
    description: "Classic PvP with bans, picks, and assigned roles.",
  },
  {
    label: "Ranked Solo/Duo",
    queueId: 420,
    category: "rift",
    description: "Climb the ladder alone or with one trusted duo.",
  },
  {
    label: "Ranked Flex",
    queueId: 440,
    category: "rift",
    description: "Competitive team queue for coordinated groups.",
  },
  {
    label: "Practice Tool",
    queueId: 900,
    category: "rift",
    note: "Solo testing",
    description: "Open a sandbox match for mechanics and builds.",
    disabledReason: "Practice lobby flow coming next",
  },
  {
    label: "Custom Game",
    queueId: 0,
    category: "rift",
    note: "Private lobby",
    description: "Create a private room and invite players.",
    disabledReason: "Custom lobby flow coming next",
  },
  {
    label: "ARAM",
    queueId: 450,
    category: "aram",
    description: "One lane, fast fights, random champion chaos.",
  },
  {
    label: "Arena",
    queueId: 1700,
    category: "alternate",
    description: "Compact skirmishes with rotating mode rules.",
  },
];

const fallbackFriends = [
  { name: "NocturneMain#DUSK", status: "Online" as FriendStatus, rank: "Gold II" },
  { name: "MidOrFeed#GG", status: "In Game" as FriendStatus, rank: "Platinum IV" },
  { name: "SupportArc#WARD", status: "Away" as FriendStatus, rank: "Silver I" },
  { name: "TopGap#BONK", status: "Offline" as FriendStatus, rank: "Offline" },
];

function formatFriendStatus(friend: LeagueFriend): FriendStatus {
  const gameStatus = friend.lol?.gameStatus?.toLowerCase();
  const availability = friend.availability?.toLowerCase();

  if (availability === "offline" || !availability) return "Offline";
  if (gameStatus && gameStatus !== "outofgame") return "In Game";
  if (availability === "away" || availability === "dnd") return "Away";
  return "Online";
}

function formatTier(tier?: string, rank?: string) {
  if (!tier || !rank) return "Unranked";
  return `${tier.charAt(0)}${tier.slice(1).toLowerCase()} ${rank}`;
}

function formatPosition(position?: string) {
  const positions: Record<string, string> = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MIDDLE: "Mid",
    BOTTOM: "Bot",
    UTILITY: "Support",
    UNSELECTED: "Fill",
  };

  return positions[position ?? ""] ?? "Fill";
}

function formatQueueName(queueId?: number) {
  const queues: Record<number, string> = {
    400: "Draft Pick",
    420: "Ranked Solo / Duo",
    430: "Normal Blind",
    440: "Ranked Flex",
    450: "ARAM",
    480: "Swiftplay",
    700: "Clash",
    1700: "Arena",
  };

  return queueId ? queues[queueId] ?? `Queue ${queueId}` : "Current Lobby";
}

function getQueueId(queue: LeagueGameQueue) {
  const queueId = queue.queueId ?? queue.id;
  return typeof queueId === "string" ? Number(queueId) : queueId;
}

function isQueueAvailable(queue?: LeagueGameQueue) {
  if (!queue) return true;

  const queueState = String(
    queue.queueAvailability ?? queue.availability ?? queue.status ?? "Available",
  ).toLowerCase();

  return (
    queue.enabled !== false &&
    queue.isAvailable !== false &&
    queue.isVisible !== false &&
    queue.hideFromGameSelect !== true &&
    !queueState.includes("disabled") &&
    !queueState.includes("unavailable") &&
    !queueState.includes("not_available")
  );
}

function getQueueDisabledReason(queue?: LeagueGameQueue) {
  if (!queue) return "Unavailable";
  return queue.queueAvailability ?? queue.availability ?? queue.status ?? "Unavailable";
}

function buildEmptySlot(slotNumber: number): LobbySlot {
  return {
    name: "Invite",
    tag: `Slot ${slotNumber}`,
    role: "Open",
    rank: "",
    lp: "",
    status: "empty",
    accent: "empty",
    cardSkin: "empty",
  };
}

function sameText(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function formatReadyCheckTimer(timer?: number | null) {
  const numericTimer = Number(timer);

  if (!Number.isFinite(numericTimer)) {
    return null;
  }

  return Math.max(0, Math.ceil(numericTimer > 1000 ? numericTimer / 1000 : numericTimer));
}

function statusPriority(status: FriendStatus) {
  return { Online: 0, "In Game": 1, Away: 2, Offline: 3 }[status];
}

function isMatchmakingActive(search?: LeagueMatchmakingSearch | null) {
  if (!search) return false;

  const state = String(search.searchState ?? search.state ?? search.status ?? "").toLowerCase();

  return (
    state.includes("search") ||
    state.includes("finding") ||
    state.includes("waiting") ||
    state.includes("found") ||
    state.includes("inprogress")
  ) && !state.includes("invalid") && !state.includes("cancel") && !state.includes("error");
}

function flattenChampSelectActions(session?: LeagueChampSelectSession | null) {
  return session?.actions?.flat() ?? [];
}

function phaseLabel(phase?: string) {
  const labels: Record<string, string> = {
    BAN_PICK: "Ban / Pick",
    BAN_PICK_TURN: "Your Turn",
    FINALIZATION: "Finalizing",
    PLANNING: "Planning",
    GAME_STARTING: "Game Starting",
  };

  return labels[phase ?? ""] ?? phase ?? "Waiting";
}

function formatPhaseTimer(milliseconds?: number) {
  const numeric = Number(milliseconds);

  if (!Number.isFinite(numeric)) return "--";

  return String(Math.max(0, Math.ceil(numeric / 1000))).padStart(2, "0");
}

function formatElapsedTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getLeagueQueueElapsedSeconds(search?: LeagueMatchmakingSearch | null) {
  if (!search) return null;

  const rawSeconds = search.timeInQueueSeconds ?? search.timeInQueue;
  const numericSeconds = Number(rawSeconds);

  if (!Number.isFinite(numericSeconds)) return null;

  return numericSeconds > 1000 ? Math.floor(numericSeconds / 1000) : Math.floor(numericSeconds);
}

function championInitial(champion?: ChampionSummary) {
  return champion?.name?.slice(0, 1) ?? "?";
}

function championIconSrc(championId?: number | null) {
  return championId && championId > 0 ? `bonk-lcu://champion-icons/${championId}.png` : "";
}

function isLocalChampAction(
  action: LeagueChampSelectAction,
  localPlayerCellId?: number,
) {
  const actionType = String(action.type ?? "").toLowerCase();

  return (
    Number(action.actorCellId) === Number(localPlayerCellId) &&
    (actionType === "pick" || actionType === "ban")
  );
}

function App() {
  const [account, setAccount] = useState<RiotAccount | null>(null);
  const [rankedProfile, setRankedProfile] = useState<RankedProfile | null>(null);
  const [accountStatus, setAccountStatus] = useState("Not loaded");
  const [leagueClientStatus, setLeagueClientStatus] = useState<LeagueClientStatus | null>(
    null,
  );
  const [leagueOverview, setLeagueOverview] = useState<LeagueOverview | null>(null);
  const [selectedQueueId, setSelectedQueueId] = useState(420);
  const [selectedCategory, setSelectedCategory] = useState<ModeCategory>("rift");
  const [selectedRole, setSelectedRole] = useState("Mid");
  const [selectedSecondaryRole, setSelectedSecondaryRole] = useState("Jungle");
  const [selectedCardSkinId, setSelectedCardSkinId] = useState("sunspire");
  const [modesOpen, setModesOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [championSearch, setChampionSearch] = useState("");
  const [selectedChampionId, setSelectedChampionId] = useState<number | null>(null);
  const [actionStatus, setActionStatus] = useState("Ready");
  const [queueStartedAt, setQueueStartedAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [autoAccept, setAutoAccept] = useState(
    () => window.localStorage.getItem("bonk:autoAccept") === "true",
  );
  const [activeNav, setActiveNav] = useState<(typeof navItems)[number]>("Home");
  const autoAcceptingRef = useRef(false);

  const soloQueue = rankedProfile?.soloQueue ?? null;
  const playerRank = soloQueue ? formatTier(soloQueue.tier, soloQueue.rank) : "Unranked";
  const playerLp = soloQueue ? `${soloQueue.leaguePoints} LP` : "0 LP";
  const playerWins = soloQueue?.wins ?? 0;
  const playerLosses = soloQueue?.losses ?? 0;
  const playerWinRate =
    playerWins + playerLosses > 0
      ? Math.round((playerWins / (playerWins + playerLosses)) * 100)
      : 0;

  const lobbyMembers = leagueOverview?.lobby?.members ?? [];
  const localLobbyMember = leagueOverview?.lobby?.localMember ?? null;
  const isInLeagueLobby = lobbyMembers.length > 0;
  const currentQueueId = leagueOverview?.lobby?.gameConfig?.queueId;
  const queueLabel = formatQueueName(currentQueueId);
  const selectedQueue =
    queueOptions.find((queue) => queue.queueId === selectedQueueId) ?? queueOptions[2];
  const selectedQueueLabel = selectedQueue.label;
  const selectedCardSkin =
    cardSkins.find((cardSkin) => cardSkin.id === selectedCardSkinId) ?? cardSkins[0];
  const knownGameQueues = leagueOverview?.gameQueues ?? [];
  const matchmakingSearch = leagueOverview?.matchmakingSearch ?? null;
  const isInMatchmaking = isMatchmakingActive(matchmakingSearch);
  const leagueQueueElapsedSeconds = getLeagueQueueElapsedSeconds(matchmakingSearch);
  const localQueueElapsedSeconds = queueStartedAt
    ? Math.floor((clockNow - queueStartedAt) / 1000)
    : 0;
  const queueElapsedSeconds = leagueQueueElapsedSeconds ?? localQueueElapsedSeconds;
  const queueElapsedLabel = formatElapsedTime(queueElapsedSeconds);
  const readyCheck = leagueOverview?.readyCheck ?? null;
  const isReadyCheckActive = readyCheck?.state?.toLowerCase() === "inprogress";
  const readyCheckResponse = readyCheck?.playerResponse?.toLowerCase();
  const canRespondToReadyCheck =
    isReadyCheckActive && (!readyCheckResponse || readyCheckResponse === "none");
  const readyCheckSeconds = formatReadyCheckTimer(
    readyCheck?.timer ?? readyCheck?.readyCheckTimer ?? readyCheck?.timeLeft ?? null,
  );
  const readyCheckProgress = Math.max(
    0,
    Math.min(
      100,
      readyCheckSeconds === null
        ? 100
        : (readyCheckSeconds / READY_CHECK_TOTAL_SECONDS) * 100,
    ),
  );
  const visibleQueueOptions = queueOptions.filter(
    (queue) => queue.category === selectedCategory,
  );
  const champSelect = leagueOverview?.champSelect ?? null;
  const champSelectSession = champSelect?.session ?? null;
  const isChampSelectActive = Boolean(champSelectSession);
  const champActions = flattenChampSelectActions(champSelectSession);
  const localPlayerCellId = champSelectSession?.localPlayerCellId;
  const localActions = champActions.filter((action) =>
    isLocalChampAction(action, localPlayerCellId),
  );
  const localAction =
    localActions.find(
      (action) =>
        action.isInProgress &&
        !action.completed &&
        (String(action.type).toLowerCase() === "pick" ||
          String(action.type).toLowerCase() === "ban"),
    ) ??
    localActions.find(
      (action) =>
        !action.completed &&
        (String(action.type).toLowerCase() === "pick" ||
          String(action.type).toLowerCase() === "ban"),
    ) ??
    null;
  const localActionType = String(localAction?.type ?? "").toLowerCase();
  const localPlayer = champSelectSession?.myTeam?.find(
    (player) => player.cellId === localPlayerCellId,
  );
  const activeChampionId = selectedChampionId ?? localPlayer?.championId ?? localAction?.championId ?? null;
  const championById = useMemo(() => {
    const map = new Map<number, ChampionSummary>();

    champSelect?.champions.forEach((champion) => {
      if (champion.id > 0) {
        map.set(champion.id, champion);
      }
    });

    return map;
  }, [champSelect]);
  const availableChampionIds =
    localActionType === "ban"
      ? champSelect?.bannableChampionIds ?? []
      : champSelect?.pickableChampionIds ?? [];
  const availableChampionSet = useMemo(
    () => new Set(availableChampionIds.map(Number)),
    [availableChampionIds],
  );
  const visibleChampions = useMemo(() => {
    const query = championSearch.trim().toLowerCase();

    return (champSelect?.champions ?? [])
      .filter((champion) => champion.id > 0)
      .filter((champion) => !query || champion.name.toLowerCase().includes(query))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [champSelect, championSearch]);
  const bannedChampionIds = new Set([
    ...(champSelectSession?.bans?.myTeamBans ?? []),
    ...(champSelectSession?.bans?.theirTeamBans ?? []),
  ]);
  const selectedChampion = activeChampionId ? championById.get(activeChampionId) : null;
  const phaseTimeLeft = champSelectSession?.timer?.adjustedTimeLeftInPhase;
  const phaseTotalTime = champSelectSession?.timer?.totalTimeInPhase;
  const numericPhaseTimeLeft = Number(phaseTimeLeft);
  const numericPhaseTotalTime = Number(phaseTotalTime);
  const phaseProgress =
    Number.isFinite(numericPhaseTimeLeft) &&
    Number.isFinite(numericPhaseTotalTime) &&
    numericPhaseTotalTime > 0
      ? Math.max(0, Math.min(100, (numericPhaseTimeLeft / numericPhaseTotalTime) * 100))
      : 100;

  const findKnownQueue = (queueId: number) =>
    knownGameQueues.find((queue) => getQueueId(queue) === queueId);

  const friends = useMemo(() => {
    const realFriends =
      leagueOverview?.friends.map((friend) => {
        const status = formatFriendStatus(friend);
        const name = friend.gameName
          ? `${friend.gameName}#${friend.gameTag ?? friend.tagLine ?? ""}`
          : friend.name || "League Friend";

        return {
          name,
          status,
          rank:
            status === "Offline"
              ? "Offline"
              : friend.lol?.gameStatus ?? friend.productName ?? friend.product ?? "League",
        };
      }) ?? [];

    const source = realFriends.length > 0 ? realFriends : fallbackFriends;
    const query = friendSearch.trim().toLowerCase();

    return source
      .filter((friend) => !query || friend.name.toLowerCase().includes(query))
      .sort((left, right) => {
        const priority = statusPriority(left.status) - statusPriority(right.status);
        return priority || left.name.localeCompare(right.name);
      });
  }, [friendSearch, leagueOverview]);

  const lobby: LobbySlot[] = useMemo(() => {
    if (lobbyMembers.length > 0) {
      const emptySlots: LobbySlot[] = [1, 2, 3, 4, 5].map(buildEmptySlot);
      const sideIndexes = [1, 3, 0, 4];

      const isLocalMember = (member: LeagueLobbyMember) =>
        Boolean(
          (member.puuid && localLobbyMember?.puuid && member.puuid === localLobbyMember.puuid) ||
            (member.summonerId &&
              localLobbyMember?.summonerId &&
              member.summonerId === localLobbyMember.summonerId) ||
            sameText(member.gameName, account?.gameName) ||
            sameText(member.gameName, localLobbyMember?.gameName) ||
            sameText(member.summonerName, localLobbyMember?.summonerName) ||
            sameText(member.summonerName, account?.gameName),
        );

      let localIndex = lobbyMembers.findIndex(isLocalMember);

      if (localIndex < 0 && lobbyMembers.length === 1) {
        localIndex = 0;
      }

      if (localIndex < 0) {
        localIndex = lobbyMembers.findIndex((member) => member.isLeader);
      }

      if (localIndex < 0) {
        localIndex = 0;
      }

      const memberToSlot = (
        member: LeagueLobbyMember,
        index: number,
        forceLocal = false,
      ): LobbySlot => {
        const isLocal = forceLocal || isLocalMember(member);
        const hasRiotId = member.gameName && member.tagLine;
        const fallbackName =
          leagueOverview?.currentSummoner?.gameName ??
          leagueOverview?.currentSummoner?.displayName ??
          account?.gameName;
        const memberName = isLocal
          ? fallbackName ?? member.gameName ?? member.summonerName ?? "Party Member"
          : hasRiotId
            ? member.gameName ?? "Party Member"
            : member.summonerName ?? member.gameName ?? "Party Member";
        const memberTag = isLocal
          ? account?.tagLine ?? leagueOverview?.currentSummoner?.tagLine ?? member.tagLine
          : member.tagLine;
        const accents: LobbySlot["accent"][] = ["blue", "teal", "violet", "blue"];
        const skin =
          isLocal ? selectedCardSkin : (cardSkins[(index + 1) % cardSkins.length] ?? selectedCardSkin);

        return {
          name: memberName,
          tag: memberTag ? `#${memberTag}` : "",
          role: formatPosition(member.firstPositionPreference || member.secondPositionPreference),
          rank: isLocal ? playerRank : "Party Member",
          lp: isLocal ? playerLp : "In Lobby",
          status: member.isLeader || isLocal ? "leader" : "ready",
          accent: isLocal ? selectedCardSkin.accent : accents[index] ?? "blue",
          cardSkin: skin.id,
        };
      };

      const localMember = lobbyMembers[localIndex] ?? localLobbyMember ?? lobbyMembers[0];

      if (localMember) {
        emptySlots[2] = memberToSlot(localMember, 0, true);
      }

      lobbyMembers
        .filter((_, index) => index !== localIndex)
        .slice(0, 4)
        .forEach((member, index) => {
          emptySlots[sideIndexes[index]] = memberToSlot(member, index);
        });

      return emptySlots;
    }

    return [
      buildEmptySlot(1),
      buildEmptySlot(2),
      {
        name: account?.gameName ?? "Player",
        tag: account?.tagLine ? `#${account.tagLine}` : "",
        role: `${selectedRole} / ${selectedSecondaryRole}`,
        rank: playerRank,
        lp: playerLp,
        status: "leader",
        accent: selectedCardSkin.accent,
        cardSkin: selectedCardSkin.id,
      },
      buildEmptySlot(4),
      buildEmptySlot(5),
    ];
  }, [
    account,
    leagueOverview,
    lobbyMembers,
    localLobbyMember,
    playerLp,
    playerRank,
    selectedRole,
    selectedSecondaryRole,
    selectedCardSkin,
  ]);

  const loadAccount = async () => {
    try {
      setAccountStatus("Loading account...");
      const riotAccount = await window.bonkClient.getAccount();
      setAccount(riotAccount);
      setAccountStatus("League account connected");
    } catch (error) {
      console.error(error);
      setAccountStatus(error instanceof Error ? error.message : "Account failed");
    }
  };

  const loadRankedProfile = useCallback(async () => {
    try {
      setAccountStatus("Loading rank...");
      const profile = await window.bonkClient.getRankedProfile();
      setAccount(profile.account);
      setRankedProfile(profile);
      setAccountStatus(
        profile.soloQueue
          ? `Rank loaded from ${profile.source === "riot-api" ? "Riot API" : "League client"}`
          : "No solo queue rank",
      );
    } catch (error) {
      console.error(error);
      setAccountStatus(error instanceof Error ? error.message : "Rank failed");
    }
  }, []);

  const checkLeagueClient = useCallback(async () => {
    try {
      const overview = await window.bonkClient.getLeagueOverview();
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
    } catch (error) {
      console.error(error);
      setLeagueOverview(null);
      setLeagueClientStatus({
        connected: false,
        status: "not_open",
        message: "League client check failed",
      });
    }
  }, []);

  const selectLeagueFolder = async () => {
    try {
      const status = await window.bonkClient.selectLeagueFolder();
      setLeagueClientStatus(status);
      void checkLeagueClient();
    } catch (error) {
      console.error(error);
      setLeagueClientStatus({
        connected: false,
        status: "not_open",
        message: "League folder selection failed",
      });
    }
  };

  const launchLeagueClient = async () => {
    try {
      setActionStatus("Launching League client...");
      const status = await window.bonkClient.launchLeagueClient();
      setLeagueClientStatus(status);
      setActionStatus(status.message);
      await checkLeagueClient();

      if (status.connected) {
        void loadRankedProfile();
      }
    } catch (error) {
      console.error(error);
      setActionStatus("Could not launch League client");
    }
  };

  const createLeagueLobby = async (queueId: number) => {
    const queue = queueOptions.find((option) => option.queueId === queueId);
    const label = queue?.label ?? formatQueueName(queueId);
    const knownQueue = findKnownQueue(queueId);

    setSelectedQueueId(queueId);

    if (
      queue?.disabledReason ||
      (knownGameQueues.length > 0 && (!knownQueue || !isQueueAvailable(knownQueue)))
    ) {
      setActionStatus(queue?.disabledReason ?? `${label} is unavailable`);
      return;
    }

    if (isInLeagueLobby && currentQueueId === queueId) {
      setActionStatus(`${label} lobby already open`);
      return;
    }

    try {
      setActionStatus(isInLeagueLobby ? `Switching to ${label}...` : `Creating ${label} lobby...`);
      const overview = await window.bonkClient.createLeagueLobby(queueId);
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus(`${label} lobby ready`);
    } catch (error) {
      console.error(error);
      setActionStatus("Could not create lobby");
    }
  };

  const startQueue = async () => {
    try {
      if (!isInLeagueLobby) {
        setActionStatus("Create a lobby first");
        return;
      }

      setActionStatus("Starting queue...");
      const overview = await window.bonkClient.startMatchmaking();
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus("Queue started");
    } catch (error) {
      console.error(error);
      setActionStatus("Could not start queue");
    }
  };

  const cancelQueue = async () => {
    try {
      setActionStatus("Leaving queue...");
      const overview = await window.bonkClient.cancelMatchmaking();
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus("Queue cancelled");
    } catch (error) {
      console.error(error);
      setActionStatus("Could not leave queue");
    }
  };

  const handleQueueButton = async () => {
    if (isInMatchmaking && !isReadyCheckActive) {
      await cancelQueue();
      return;
    }

    if (isInLeagueLobby) {
      await startQueue();
      return;
    }

    await createLeagueLobby(selectedQueueId);
  };

  const performChampSelectAction = async (completed: boolean) => {
    if (!localAction || !activeChampionId) {
      setActionStatus("Select a champion first");
      return;
    }

    try {
      setActionStatus(
        completed
          ? localActionType === "ban"
            ? "Locking ban..."
            : "Locking pick..."
          : "Selecting champion...",
      );
      const overview = await window.bonkClient.champSelectAction(localAction.id, {
        championId: activeChampionId,
        completed,
      });
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus(completed ? "Action locked" : "Champion selected");
    } catch (error) {
      console.error(error);
      setActionStatus("Champ select action failed");
    }
  };

  const selectChampionForAction = async (championId: number) => {
    setSelectedChampionId(championId);

    if (!localAction) {
      return;
    }

    try {
      setActionStatus("Hovering champion...");
      const overview = await window.bonkClient.champSelectAction(localAction.id, {
        championId,
        completed: false,
      });
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus("Champion hovered");
    } catch (error) {
      console.error(error);
      setActionStatus("Could not hover champion");
    }
  };

  const selectRunePage = async (pageId: number) => {
    try {
      setActionStatus("Selecting rune page...");
      const overview = await window.bonkClient.selectRunePage(pageId);
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus("Rune page selected");
    } catch (error) {
      console.error(error);
      setActionStatus("Could not select rune page");
    }
  };

  const acceptReadyCheck = async () => {
    try {
      setActionStatus("Accepting match...");
      const overview = await window.bonkClient.acceptReadyCheck();
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus("Match accepted");
    } catch (error) {
      console.error(error);
      setActionStatus("Could not accept match");
    }
  };

  const declineReadyCheck = async () => {
    try {
      setActionStatus("Declining match...");
      const overview = await window.bonkClient.declineReadyCheck();
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus("Match declined");
    } catch (error) {
      console.error(error);
      setActionStatus("Could not decline match");
    }
  };

  const exitApp = async () => {
    await window.bonkClient.exitApp();
  };

  useEffect(() => {
    let cancelled = false;

    const bootClient = async () => {
      try {
        setActionStatus("Launching League client...");
        const status = await window.bonkClient.launchLeagueClient();

        if (cancelled) {
          return;
        }

        setLeagueClientStatus(status);
        setActionStatus(status.message);
        await checkLeagueClient();
        void loadRankedProfile();
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setActionStatus("League auto launch failed");
          void checkLeagueClient();
          void loadRankedProfile();
        }
      }
    };

    void bootClient();

    const intervalId = window.setInterval(() => {
      void checkLeagueClient();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [checkLeagueClient, loadRankedProfile]);

  useEffect(() => {
    window.localStorage.setItem("bonk:autoAccept", String(autoAccept));
  }, [autoAccept]);

  useEffect(() => {
    if (isInMatchmaking && queueStartedAt === null) {
      setQueueStartedAt(Date.now());
    }

    if (!isInMatchmaking && queueStartedAt !== null) {
      setQueueStartedAt(null);
    }
  }, [isInMatchmaking, queueStartedAt]);

  useEffect(() => {
    if (!isInMatchmaking) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isInMatchmaking]);

  useEffect(() => {
    if (!autoAccept || !canRespondToReadyCheck || autoAcceptingRef.current) {
      return;
    }

    autoAcceptingRef.current = true;
    setActionStatus("Auto accepting match...");

    window.bonkClient
      .acceptReadyCheck()
      .then((overview) => {
        setLeagueOverview(overview);
        setLeagueClientStatus(overview.status);
        setActionStatus("Match auto accepted");
      })
      .catch((error) => {
        console.error(error);
        setActionStatus("Auto accept failed");
      })
      .finally(() => {
        window.setTimeout(() => {
          autoAcceptingRef.current = false;
        }, 1500);
      });
  }, [autoAccept, canRespondToReadyCheck]);

  useEffect(() => {
    const currentQueue = queueOptions.find((queue) => queue.queueId === currentQueueId);

    if (currentQueue) {
      setSelectedQueueId(currentQueue.queueId);
      setSelectedCategory(currentQueue.category);
    }
  }, [currentQueueId]);

  return (
    <main className="clientShell">
      <div className="scene" aria-hidden="true">
        <span className="sceneGlow sceneGlowA" />
        <span className="sceneGlow sceneGlowB" />
        <span className="sceneRune runeA" />
        <span className="sceneRune runeB" />
        <span className="particleField" />
      </div>

      <aside className="sideNav">
        <div className="brandMark">
          <span>B</span>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              className={activeNav === item ? "navItem active" : "navItem"}
              key={item}
              onClick={() => setActiveNav(item)}
            >
              <span>{item.slice(0, 1)}</span>
              <small>{item}</small>
            </button>
          ))}
        </nav>
        <button className="navItem exitNav" onClick={() => void exitApp()}>
          <span>X</span>
          <small>Exit</small>
        </button>
      </aside>

      <section className="mainStage">
        <header className="topBar">
          <div className="clientTitleBlock">
            <p className="eyebrow">BONK Client</p>
            <h1>{activeNav === "Home" ? "Command Center" : activeNav}</h1>
          </div>
          <div className="systemStrip">
            <span className={leagueClientStatus?.connected ? "statusLive" : "statusOff"} />
            <div>
              <strong>{leagueClientStatus?.connected ? "League connected" : "League offline"}</strong>
              <small>
                {leagueClientStatus?.connected
                  ? `${leagueClientStatus.protocol}:${leagueClientStatus.port}`
                  : "Open League to sync live data"}
              </small>
            </div>
          </div>
          <div className="profilePill">
            <div>
              <strong>
                {account
                  ? `${account.gameName}${account.tagLine ? ` #${account.tagLine}` : ""}`
                  : "Player"}
              </strong>
              <small>
                {playerRank} {soloQueue ? `/ ${playerLp} / ${playerWinRate}% WR` : ""}
              </small>
            </div>
            <span>{(account?.gameName ?? "P").slice(0, 1)}</span>
          </div>
        </header>

        {isReadyCheckActive ? (
          <section className="readyCheckOverlay">
            <div className="readyCheckPanel">
              <p>Match Found</p>
              <h2>{autoAccept ? "Auto Accept Armed" : "Ready Check"}</h2>
              <span>
                {canRespondToReadyCheck
                  ? "Accept the match to enter champion select."
                  : `Response: ${readyCheck?.playerResponse ?? "Waiting"}`}
              </span>
              {readyCheckSeconds !== null ? (
                <strong className="readyTimer">{readyCheckSeconds}</strong>
              ) : null}
              <div className="readyProgress" aria-hidden="true">
                <span style={{ width: `${readyCheckProgress}%` }} />
              </div>
              <div className="readyActions">
                <button
                  className="acceptButton"
                  disabled={!canRespondToReadyCheck}
                  onClick={() => void acceptReadyCheck()}
                >
                  Accept
                </button>
                <button
                  className="declineButton"
                  disabled={!canRespondToReadyCheck}
                  onClick={() => void declineReadyCheck()}
                >
                  Decline
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {isChampSelectActive ? (
          <section className="champSelectStage">
            <header className="champSelectHeader">
              <div>
                <p className="eyebrow">Champion Select</p>
                <h2>{phaseLabel(champSelectSession?.timer?.phase)}</h2>
                <span>{localAction ? `Your ${localActionType} phase is active` : "Waiting for your turn"}</span>
              </div>
              <div className="champPhaseTimer">
                <strong>{formatPhaseTimer(phaseTimeLeft)}</strong>
                <div className="champPhaseBar">
                  <span style={{ width: `${phaseProgress}%` }} />
                </div>
              </div>
              <div className="champActionSummary">
                <small>Selected</small>
                <strong>{selectedChampion?.name ?? "None"}</strong>
                <span>{actionStatus}</span>
              </div>
            </header>

            <div className="champSelectGrid">
              <aside className="teamDraftColumn">
                <p className="eyebrow">Your Team</p>
                {(champSelectSession?.myTeam ?? []).map((player) => {
                  const champion = player.championId
                    ? championById.get(player.championId)
                    : null;

                  return (
                    <article
                      className={player.cellId === localPlayerCellId ? "draftPlayer active" : "draftPlayer"}
                      key={player.cellId}
                    >
                      <span className="champIconSlot">
                        {champion ? (
                          <img src={championIconSrc(champion.id)} alt={champion.name} />
                        ) : (
                          championInitial(champion ?? undefined)
                        )}
                      </span>
                      <div>
                        <strong>{champion?.name ?? "Selecting..."}</strong>
                        <small>{formatPosition(player.assignedPosition)}</small>
                      </div>
                    </article>
                  );
                })}
                <div className="banStrip">
                  <small>Team bans</small>
                  <div>
                    {(champSelectSession?.bans?.myTeamBans ?? []).filter(Boolean).map((championId) => (
                      <span key={championId}>
                        <img
                          src={championIconSrc(championId)}
                          alt={championById.get(championId)?.name ?? "Banned champion"}
                        />
                      </span>
                    ))}
                  </div>
                </div>
                <div className="enemyDraftMini">
                  <small>Opponent Team</small>
                  {(champSelectSession?.theirTeam ?? []).map((player) => {
                    const champion = player.championId
                      ? championById.get(player.championId)
                      : null;

                    return (
                      <div key={player.cellId}>
                        <span>
                          {champion ? (
                            <img src={championIconSrc(champion.id)} alt={champion.name} />
                          ) : (
                            championInitial(champion ?? undefined)
                          )}
                        </span>
                        <strong>{champion?.name ?? "Hidden"}</strong>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <section className="championBrowser">
                <div className="championBrowserTop">
                  <input
                    onChange={(event) => setChampionSearch(event.target.value)}
                    placeholder="Search champions"
                    value={championSearch}
                  />
                  <div>
                    <span>{visibleChampions.length} champions</span>
                    <span>{localActionType === "ban" ? "Ban phase" : "Pick phase"}</span>
                  </div>
                </div>
                <div className="championGrid">
                  {visibleChampions.map((champion) => {
                    const unavailable =
                      bannedChampionIds.has(champion.id) ||
                      (availableChampionSet.size > 0 && !availableChampionSet.has(champion.id));
                    const selected = activeChampionId === champion.id;

                    return (
                      <button
                        className={`${selected ? "selected" : ""} ${unavailable ? "unavailable" : ""}`}
                        disabled={unavailable}
                        key={champion.id}
                        onClick={() => void selectChampionForAction(champion.id)}
                      >
                        <span>
                          <img src={championIconSrc(champion.id)} alt={champion.name} />
                        </span>
                        <small>{champion.name}</small>
                      </button>
                    );
                  })}
                </div>
              </section>

              <aside className="champControlColumn">
                <div className="selectedChampionPanel">
                  <p className="eyebrow">{localActionType === "ban" ? "Ban Target" : "Pick Target"}</p>
                  <div className="selectedChampionPortrait">
                    {selectedChampion ? (
                      <img
                        src={championIconSrc(selectedChampion.id)}
                        alt={selectedChampion.name}
                      />
                    ) : (
                      championInitial(selectedChampion ?? undefined)
                    )}
                  </div>
                  <h3>{selectedChampion?.name ?? "Choose Champion"}</h3>
                  <span>
                    {localAction
                      ? `Action ${localAction.id} / ${localActionType.toUpperCase()} / Cell ${localPlayerCellId}`
                      : `No action available / Cell ${localPlayerCellId ?? "?"} / ${localActions.length} local actions`}
                  </span>
                  <div className="champActionButtons">
                    <button
                      className="ghostButton"
                      disabled={!localAction || !activeChampionId}
                      onClick={() => void performChampSelectAction(false)}
                    >
                      Hover
                    </button>
                    <button
                      className="primaryPlayButton lockButton"
                      disabled={!localAction || !activeChampionId}
                      onClick={() => void performChampSelectAction(true)}
                    >
                      {localActionType === "ban" ? "Ban" : "Lock In"}
                    </button>
                  </div>
                </div>

                <div className="runePanel">
                  <div className="panelHeader">
                    <div>
                      <p className="eyebrow">Runes</p>
                      <h3>{champSelect?.currentRunePage?.name ?? "Rune Pages"}</h3>
                    </div>
                  </div>
                  <div className="runePageList">
                    {(champSelect?.runePages ?? []).map((page) => (
                      <button
                        className={page.current ? "selected" : ""}
                        key={page.id}
                        onClick={() => void selectRunePage(page.id)}
                      >
                        <strong>{page.name}</strong>
                        <small>
                          {champSelect?.perkStyles.find((style) => style.id === page.primaryStyleId)?.name ??
                            "Primary"}{" "}
                          /{" "}
                          {champSelect?.perkStyles.find((style) => style.id === page.subStyleId)?.name ??
                            "Secondary"}
                        </small>
                      </button>
                    ))}
                    {(champSelect?.runePages ?? []).length === 0 ? (
                      <div className="emptyState">
                        <strong>No rune pages found</strong>
                        <small>Open League champ select to sync rune pages.</small>
                      </div>
                    ) : null}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        ) : (
        <section className="playStage">
          <div className="playToolbar">
            <button className="drawerButton" onClick={() => setModesOpen(true)}>
              Game Modes
            </button>
            <div className="queueTitle">
              <p className="eyebrow">Selected Queue</p>
              <h2>{isInLeagueLobby ? queueLabel : selectedQueueLabel}</h2>
              <span>{selectedQueue.description}</span>
            </div>
            <div className="toolbarSpacer" aria-hidden="true" />
          </div>

          <section className="lobbyFocus">
            <div className="partyCards partyCardsLarge">
              {lobby.map((slot, index) => (
                <article
                  className={`partyCard ${slot.status} ${slot.accent} skin-${slot.cardSkin}`}
                  key={`${slot.name}-${index}`}
                >
                  {slot.status === "empty" ? (
                    <button
                      className="emptyPartySlot"
                      onClick={() => {
                        setFriendsOpen(true);
                        setActionStatus("Choose a friend from the social panel");
                      }}
                    >
                      <span>+</span>
                      <strong>Invite Player</strong>
                      <small>{slot.tag}</small>
                    </button>
                  ) : (
                    <>
                      <div className="cardFrameLabel">
                        {cardSkins.find((cardSkin) => cardSkin.id === slot.cardSkin)?.name ??
                          selectedCardSkin.name}
                      </div>
                      <div className="cardPortrait">{slot.name.slice(0, 1)}</div>
                      <span className="roleBadge">{slot.role}</span>
                      <div className="partyPlate">
                        <strong>
                          {slot.name} <span>{slot.tag}</span>
                        </strong>
                        <small>{slot.rank} / {slot.lp}</small>
                      </div>
                      <em>{slot.status === "leader" ? "Leader" : "Ready"}</em>
                    </>
                  )}
                </article>
              ))}
            </div>

            <div className="queueConsole">
              <div className="dualRoleSelect">
                <div>
                  <span>Primary</span>
                  <div className="roleSelect">
                    {roles.map((role) => (
                      <button
                        className={selectedRole === role ? "selected" : ""}
                        key={role}
                        onClick={() => setSelectedRole(role)}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span>Secondary</span>
                  <div className="roleSelect">
                    {roles.map((role) => (
                      <button
                        className={selectedSecondaryRole === role ? "selected" : ""}
                        key={role}
                        onClick={() => setSelectedSecondaryRole(role)}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                className={
                  isInMatchmaking && !isReadyCheckActive
                    ? "primaryPlayButton queueButton cancelQueueButton"
                    : "primaryPlayButton queueButton"
                }
                onClick={() => void handleQueueButton()}
              >
                <span>
                  {isInMatchmaking && !isReadyCheckActive
                    ? "Leave Queue"
                    : isInLeagueLobby
                      ? "Find Match"
                      : "Create Party"}
                </span>
              </button>

              <div className="queueMeta">
                <span>
                  {isInMatchmaking && !isReadyCheckActive ? "Searching for match..." : actionStatus}
                </span>
                {isInMatchmaking && !isReadyCheckActive ? (
                  <strong className="queueElapsed">Queue Time {queueElapsedLabel}</strong>
                ) : null}
                <span>{accountStatus}</span>
                <label className="autoAcceptToggle">
                  <input
                    checked={autoAccept}
                    onChange={(event) => setAutoAccept(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Auto Accept</span>
                </label>
              </div>
            </div>

            <section className={inventoryOpen ? "inventoryShelf open" : "inventoryShelf"}>
              <button className="inventoryToggle" onClick={() => setInventoryOpen(!inventoryOpen)}>
                Inventory Cards
              </button>
              <div className="inventoryCards">
                {cardSkins.map((cardSkin) => (
                  <button
                    className={`inventoryCard ${cardSkin.accent} ${
                      selectedCardSkinId === cardSkin.id ? "selected" : ""
                    }`}
                    key={cardSkin.id}
                    onClick={() => setSelectedCardSkinId(cardSkin.id)}
                  >
                    <span>{cardSkin.rarity}</span>
                    <strong>{cardSkin.name}</strong>
                    <small>{cardSkin.description}</small>
                  </button>
                ))}
              </div>
            </section>
          </section>
        </section>
        )}
      </section>

      {modesOpen ? (
        <section className="drawerOverlay" onClick={() => setModesOpen(false)}>
          <aside className="modeDrawer" onClick={(event) => event.stopPropagation()}>
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Play</p>
                <h3>Game Modes</h3>
              </div>
              <button className="closeDrawer" onClick={() => setModesOpen(false)}>
                Close
              </button>
            </div>
            <div className="categoryTabs">
              {modeCategories.map((category) => (
                <button
                  className={selectedCategory === category.id ? "selected" : ""}
                  disabled={category.id === "tft"}
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.title}
                </button>
              ))}
            </div>
            <div className="modeCards">
              {visibleQueueOptions.map((queue) => {
                const knownQueue = findKnownQueue(queue.queueId);
                const unavailable =
                  Boolean(queue.disabledReason) ||
                  (knownGameQueues.length > 0 && (!knownQueue || !isQueueAvailable(knownQueue)));
                const selected = selectedQueueId === queue.queueId;

                return (
                  <button
                    className={`modeCard ${selected ? "selected" : ""} ${
                      unavailable ? "disabled" : ""
                    }`}
                    disabled={unavailable}
                    key={queue.queueId}
                    onClick={() => {
                      setModesOpen(false);
                      void createLeagueLobby(queue.queueId);
                    }}
                  >
                    <span>{queue.note ?? categoryLabel(queue.category)}</span>
                    <strong>{queue.label}</strong>
                    <small>
                      {queue.disabledReason ??
                        (unavailable ? getQueueDisabledReason(knownQueue) : queue.description)}
                    </small>
                  </button>
                );
              })}
              {selectedCategory === "tft" ? (
                <button className="modeCard disabled" disabled>
                  <span>Separate flow</span>
                  <strong>Teamfight Tactics</strong>
                  <small>TFT support can be added after League queue flow is complete.</small>
                </button>
              ) : null}
            </div>
          </aside>
        </section>
      ) : null}

      <aside className={friendsOpen ? "socialPanel open" : "socialPanel"}>
        <button className="socialTab" onClick={() => setFriendsOpen(!friendsOpen)}>
          {friendsOpen ? "Hide" : "Friends"}
        </button>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Social</p>
            <h3>Friends</h3>
          </div>
          <span className="friendCount">{friends.length}</span>
        </div>
        <input
          className="friendSearch"
          onChange={(event) => setFriendSearch(event.target.value)}
          placeholder="Search friends"
          value={friendSearch}
        />
        <div className="friendList">
          {friends.length === 0 ? (
            <div className="emptyState">
              <strong>No friends found</strong>
              <small>Try another search or open League to sync your list.</small>
            </div>
          ) : (
            friends.map((friend) => (
              <article className="friendCard" key={friend.name}>
                <span className={`statusDot ${friend.status.replace(" ", "").toLowerCase()}`} />
                <div>
                  <strong>{friend.name}</strong>
                  <small>
                    {friend.status} / {friend.rank}
                  </small>
                </div>
                <button onClick={() => setActionStatus(`Invite queued for ${friend.name}`)}>+</button>
              </article>
            ))
          )}
        </div>
        <div className="utilityStack">
          <button onClick={launchLeagueClient}>Launch League</button>
          <button onClick={loadAccount}>Load Account</button>
          <button onClick={selectLeagueFolder}>Select League Folder</button>
          <button onClick={() => void checkLeagueClient()}>Sync Client</button>
        </div>
      </aside>
    </main>
  );
}

function categoryLabel(category: ModeCategory) {
  return modeCategories.find((item) => item.id === category)?.title ?? "Queue";
}

export default App;
