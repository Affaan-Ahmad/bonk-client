import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CARD_SKINS,
  QUEUE_OPTIONS,
  READY_CHECK_TOTAL_SECONDS,
} from "@/lib/constants";
import { createSandboxOverview } from "@/lib/sandbox";
import {
  flattenChampSelectActions,
  formatElapsedTime,
  formatPosition,
  formatTier,
  getLeagueQueueElapsedSeconds,
  isLocalChampAction,
  isMatchmakingActive,
  sameText,
  statusPriority,
  formatFriendStatus,
} from "@/lib/league-helpers";
import type {
  CardSkin,
  ChampionSummary,
  FriendView,
  LobbySlot,
} from "@/types/league";

const fallbackFriends: FriendView[] = [
  { name: "NocturneMain#DUSK", status: "Online", rank: "Gold II" },
  { name: "MidOrFeed#GG", status: "In Game", rank: "Platinum IV" },
  { name: "SupportArc#WARD", status: "Away", rank: "Silver I" },
  { name: "TopGap#BONK", status: "Offline", rank: "Offline" },
];

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
    isLocal: false,
  };
}

export type LeagueClient = ReturnType<typeof useLeagueClient>;

// BONK role label -> LCU position-preference value.
// Base, player-selectable summoner spells. Excludes smite upgrades (Challenging/
// Chilling) and other non-selectable variants. Mode-specific spells (Mark/Snowball
// = 32, URF Mark = 39) are further gated by each spell's gameModes.
const SELECTABLE_SUMMONER_SPELL_IDS = new Set([1, 3, 4, 6, 7, 11, 12, 13, 14, 21, 32, 39]);

const ROLE_TO_POSITION: Record<string, string> = {
  Top: "TOP",
  Jungle: "JUNGLE",
  Mid: "MIDDLE",
  Bot: "BOTTOM",
  Support: "UTILITY",
  Fill: "FILL",
};

const POSITION_TO_ROLE: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
  FILL: "Fill",
};

// Gameflow phases where a match is live/finishing; leaving this set = game ended.
const GAME_ACTIVE_PHASES = [
  "InProgress",
  "WaitingForStats",
  "PreEndOfGame",
  "EndOfGame",
  "Reconnect",
];

export function useLeagueClient() {
  const [account, setAccount] = useState<RiotAccount | null>(null);
  const [rankedProfile, setRankedProfile] = useState<
    Awaited<ReturnType<Window["bonkClient"]["getRankedProfile"]>> | null
  >(null);
  const [accountStatus, setAccountStatus] = useState("Not loaded");
  const [leagueClientStatus, setLeagueClientStatus] =
    useState<LeagueClientStatus | null>(null);
  const [leagueOverview, setLeagueOverview] = useState<LeagueOverview | null>(null);

  const [selectedQueueId, setSelectedQueueId] = useState(420);
  const [selectedRole, setSelectedRole] = useState("Mid");
  const [selectedSecondaryRole, setSelectedSecondaryRole] = useState("Jungle");
  // Track the last lobby preference we synced from, so we only adopt the lobby's
  // values when they actually change (not on every poll, which would fight edits).
  const syncedFirstPrefRef = useRef<string | null>(null);
  const syncedSecondPrefRef = useRef<string | null>(null);
  const [selectedCardSkinId, setSelectedCardSkinId] = useState("neon-green");
  const [actionStatus, setActionStatus] = useState("Ready");

  const [selectedChampionId, setSelectedChampionId] = useState<number | null>(null);
  const [queueStartedAt, setQueueStartedAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [autoAccept, setAutoAccept] = useState(
    () => window.localStorage.getItem("bonk:autoAccept") === "true",
  );
  const autoAcceptingRef = useRef(false);
  const [sandbox, setSandbox] = useState(false);
  const sandboxRef = useRef(false);
  const [collection, setCollection] = useState<{
    champions: LeagueCollectionChampion[];
    skins: LeagueCollectionSkin[];
  } | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [profile, setProfile] = useState<LeagueProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileLoadedRef = useRef(false);
  const prevPhaseRef = useRef<string | null>(null);
  const [dismissedBallotGameId, setDismissedBallotGameId] = useState<number | null>(null);
  const [matchDetails, setMatchDetails] = useState<
    Record<number, LeagueMatchDetail | "loading" | "error">
  >({});
  const [store, setStore] = useState<LeagueStoreData | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  // Timestamp of the most recent overview poll, for smooth timer interpolation.
  const overviewAtRef = useRef(Date.now());

  // ----- derived: rank -----
  const soloQueue = rankedProfile?.soloQueue ?? null;
  const playerRank = soloQueue ? formatTier(soloQueue.tier, soloQueue.rank) : "Unranked";
  const playerLp = soloQueue ? `${soloQueue.leaguePoints} LP` : "0 LP";
  const playerWins = soloQueue?.wins ?? 0;
  const playerLosses = soloQueue?.losses ?? 0;
  const playerWinRate =
    playerWins + playerLosses > 0
      ? Math.round((playerWins / (playerWins + playerLosses)) * 100)
      : 0;

  // ----- derived: lobby / queue -----
  const lobbyMembers = leagueOverview?.lobby?.members ?? [];
  const localLobbyMember = leagueOverview?.lobby?.localMember ?? null;
  const isInLeagueLobby = lobbyMembers.length > 0;
  const currentQueueId = leagueOverview?.lobby?.gameConfig?.queueId;
  const knownGameQueues = leagueOverview?.gameQueues ?? [];
  const selectedCardSkin: CardSkin =
    CARD_SKINS.find((skin) => skin.id === selectedCardSkinId) ?? CARD_SKINS[0];

  const matchmakingSearch = leagueOverview?.matchmakingSearch ?? null;
  const isInMatchmaking = isMatchmakingActive(matchmakingSearch);

  // ----- derived: gameflow / honor -----
  const gameflowPhase = leagueOverview?.gameflowPhase ?? null;
  const honorBallot = leagueOverview?.honorBallot ?? null;
  const activeHonorBallot =
    honorBallot && honorBallot.players.length > 0 && (honorBallot.gameId ?? -1) !== dismissedBallotGameId
      ? honorBallot
      : null;
  // Milliseconds since the last overview poll, for smoothing timers between polls.
  const sinceOverview = Math.max(0, clockNow - overviewAtRef.current);
  const leagueQueueElapsedSeconds = getLeagueQueueElapsedSeconds(matchmakingSearch);
  const localQueueElapsedSeconds = queueStartedAt
    ? (clockNow - queueStartedAt) / 1000
    : 0;
  // Anchor to the server value and tick locally so it moves every frame, not every 2s.
  const queueElapsedSeconds = isInMatchmaking
    ? Math.floor((leagueQueueElapsedSeconds ?? localQueueElapsedSeconds) + sinceOverview / 1000)
    : 0;
  const queueElapsedLabel = formatElapsedTime(queueElapsedSeconds);

  // ----- derived: queue restriction (low priority / dodge timer) -----
  const lowPriorityData = matchmakingSearch?.lowPriorityData ?? null;
  const matchmakingErrors = matchmakingSearch?.errors ?? [];
  const basePenaltySeconds = Number(
    lowPriorityData?.penaltyTimeRemaining ??
      matchmakingErrors.find((error) => Number(error.penaltyTimeRemaining) > 0)
        ?.penaltyTimeRemaining ??
      0,
  );
  const penaltySecondsRemaining =
    basePenaltySeconds > 0 ? Math.max(0, Math.ceil(basePenaltySeconds - sinceOverview / 1000)) : 0;
  const penalizedSummonerIds = [
    ...(lowPriorityData?.penalizedSummonerIds ?? []),
    ...matchmakingErrors.map((error) => error.penalizedSummonerId),
  ]
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  const restrictionReasonRaw =
    lowPriorityData?.reason ?? matchmakingErrors[0]?.errorType ?? null;
  const penalizedNames = [
    ...new Set(
      penalizedSummonerIds.map((id) => {
        if (Number(localLobbyMember?.summonerId) === id) return "You";
        const member = lobbyMembers.find((m) => Number(m.summonerId) === id);
        return member?.gameName || member?.summonerName || "You";
      }),
    ),
  ];
  const queueRestriction =
    penaltySecondsRemaining > 0 || restrictionReasonRaw
      ? {
          reason: restrictionReasonRaw,
          penaltySeconds: penaltySecondsRemaining,
          names: penalizedNames,
          isLowPriority: Boolean(lowPriorityData),
        }
      : null;

  // ----- derived: ready check (count DOWN — LCU `timer` is elapsed time) -----
  const readyCheck = leagueOverview?.readyCheck ?? null;
  const isReadyCheckActive = readyCheck?.state?.toLowerCase() === "inprogress";
  const readyCheckResponse = readyCheck?.playerResponse?.toLowerCase();
  const canRespondToReadyCheck =
    isReadyCheckActive && (!readyCheckResponse || readyCheckResponse === "none");
  const readyCheckElapsedRaw = Number(
    readyCheck?.timer ?? readyCheck?.readyCheckTimer ?? 0,
  );
  const readyCheckElapsed = Number.isFinite(readyCheckElapsedRaw)
    ? (readyCheckElapsedRaw > 1000 ? readyCheckElapsedRaw / 1000 : readyCheckElapsedRaw) +
      sinceOverview / 1000
    : 0;
  const readyCheckSeconds = isReadyCheckActive
    ? Math.max(0, Math.ceil(READY_CHECK_TOTAL_SECONDS - readyCheckElapsed))
    : null;
  const readyCheckProgress = Math.max(
    0,
    Math.min(
      100,
      readyCheckSeconds === null
        ? 100
        : (readyCheckSeconds / READY_CHECK_TOTAL_SECONDS) * 100,
    ),
  );

  // ----- derived: champ select -----
  const champSelect = leagueOverview?.champSelect ?? null;
  const champSelectSession = champSelect?.session ?? null;
  const isChampSelectActive = Boolean(champSelectSession);
  const champActions = flattenChampSelectActions(champSelectSession);
  const localPlayerCellId = champSelectSession?.localPlayerCellId;
  const localActions = champActions.filter((action) =>
    isLocalChampAction(action, localPlayerCellId),
  );
  const isPickOrBan = (action: LeagueChampSelectAction) => {
    const type = String(action.type).toLowerCase();
    return type === "pick" || type === "ban";
  };
  // The action currently in progress for the local player (your turn to act).
  const inProgressLocalAction =
    localActions.find(
      (action) => action.isInProgress && !action.completed && isPickOrBan(action),
    ) ?? null;
  // Your pick/ban actions regardless of turn (used to declare intent in planning).
  const localPickAction =
    localActions.find(
      (action) => String(action.type).toLowerCase() === "pick" && !action.completed,
    ) ?? null;
  const localBanAction =
    localActions.find(
      (action) => String(action.type).toLowerCase() === "ban" && !action.completed,
    ) ?? null;
  // Clicking a champion declares intent against: the in-progress action if it's
  // your turn, otherwise your pick action (planning/preference phase).
  const hoverAction = inProgressLocalAction ?? localPickAction ?? localBanAction ?? null;
  // You can only COMPLETE (ban / lock in) an action that is in progress.
  const completableAction = inProgressLocalAction;
  const canLock = Boolean(completableAction);
  const localAction = hoverAction;
  const localActionType = inProgressLocalAction
    ? String(inProgressLocalAction.type).toLowerCase()
    : "pick";
  const localPlayer = champSelectSession?.myTeam?.find(
    (player) => player.cellId === localPlayerCellId,
  );
  const localSpell1Id = localPlayer?.spell1Id ?? null;
  const localSpell2Id = localPlayer?.spell2Id ?? null;
  // Only the base, player-selectable spells — excludes smite upgrades/variants.
  const currentGameMode =
    knownGameQueues.find(
      (queue) => Number(queue.id ?? queue.queueId) === Number(currentQueueId),
    )?.gameMode ?? "CLASSIC";
  const rawSummonerSpells = champSelect?.summonerSpells ?? [];
  const summonerSpells = rawSummonerSpells.filter(
    (spell) =>
      SELECTABLE_SUMMONER_SPELL_IDS.has(Number(spell.id)) &&
      (!spell.gameModes ||
        spell.gameModes.length === 0 ||
        spell.gameModes.includes(currentGameMode)),
  );
  const recommendedRunePages = champSelect?.recommendedRunePages ?? [];
  const skinCarousel = champSelect?.skinCarousel ?? [];
  const localSelectedSkinId = localPlayer?.selectedSkinId ?? null;
  const activeChampionId =
    selectedChampionId ?? localPlayer?.championId ?? localAction?.championId ?? null;

  const championById = useMemo(() => {
    const map = new Map<number, ChampionSummary>();
    champSelect?.champions.forEach((champion) => {
      if (champion.id > 0) map.set(champion.id, champion as ChampionSummary);
    });
    return map;
  }, [champSelect]);

  const bannedChampionIds = useMemo(
    () =>
      new Set(
        [
          ...(champSelectSession?.bans?.myTeamBans ?? []),
          ...(champSelectSession?.bans?.theirTeamBans ?? []),
          // Bans also live in completed ban actions; include those.
          ...champActions
            .filter(
              (action) =>
                String(action.type).toLowerCase() === "ban" &&
                action.completed &&
                Number(action.championId) > 0,
            )
            .map((action) => Number(action.championId)),
        ].filter((id) => Number(id) > 0),
      ),
    [champSelectSession, champActions],
  );

  // Champions already locked/picked by ANY player (except the local player's own
  // current selection) can't be picked again.
  const takenChampionIds = useMemo(() => {
    const taken = new Set<number>();
    const players = [
      ...(champSelectSession?.myTeam ?? []),
      ...(champSelectSession?.theirTeam ?? []),
    ];
    for (const player of players) {
      if (player.cellId === champSelectSession?.localPlayerCellId) continue;
      const championId = Number(player.championId);
      if (championId > 0) taken.add(championId);
    }
    // Completed picks from the actions list, too.
    for (const action of champActions) {
      if (String(action.type).toLowerCase() !== "pick") continue;
      if (!action.completed) continue;
      if (Number(action.actorCellId) === Number(champSelectSession?.localPlayerCellId)) continue;
      const championId = Number(action.championId);
      if (championId > 0) taken.add(championId);
    }
    return taken;
  }, [champSelectSession, champActions]);

  const selectedChampion = activeChampionId
    ? championById.get(activeChampionId) ?? null
    : null;

  const rawPhaseTimeLeft = Number(champSelectSession?.timer?.adjustedTimeLeftInPhase);
  const phaseTimeLeft =
    isChampSelectActive && Number.isFinite(rawPhaseTimeLeft)
      ? Math.max(0, rawPhaseTimeLeft - sinceOverview)
      : rawPhaseTimeLeft;
  const phaseTotalTime = champSelectSession?.timer?.totalTimeInPhase;
  const numericPhaseTimeLeft = Number(phaseTimeLeft);
  const numericPhaseTotalTime = Number(phaseTotalTime);
  const phaseProgress =
    Number.isFinite(numericPhaseTimeLeft) &&
    Number.isFinite(numericPhaseTotalTime) &&
    numericPhaseTotalTime > 0
      ? Math.max(0, Math.min(100, (numericPhaseTimeLeft / numericPhaseTotalTime) * 100))
      : 100;

  const findKnownQueue = useCallback(
    (queueId: number) =>
      knownGameQueues.find((queue) => {
        const id = queue.queueId ?? queue.id;
        return (typeof id === "string" ? Number(id) : id) === queueId;
      }),
    [knownGameQueues],
  );

  // ----- derived: friends -----
  const friendsSource = useMemo(() => {
    const realFriends =
      leagueOverview?.friends.map((friend): FriendView => {
        const status = formatFriendStatus(friend);
        const name = friend.gameName
          ? `${friend.gameName}#${friend.gameTag ?? friend.tagLine ?? ""}`
          : friend.name || "League Friend";
        return {
          name,
          status,
          summonerId: friend.summonerId,
          rank:
            status === "Offline"
              ? "Offline"
              : friend.lol?.gameStatus ?? friend.productName ?? friend.product ?? "League",
        };
      }) ?? [];
    return realFriends.length > 0 ? realFriends : fallbackFriends;
  }, [leagueOverview]);

  const getFriends = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      return friendsSource
        .filter((friend) => !q || friend.name.toLowerCase().includes(q))
        .sort((left, right) => {
          const priority = statusPriority(left.status) - statusPriority(right.status);
          return priority || left.name.localeCompare(right.name);
        });
    },
    [friendsSource],
  );

  // ----- derived: party slots -----
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
      if (localIndex < 0 && lobbyMembers.length === 1) localIndex = 0;
      if (localIndex < 0) localIndex = lobbyMembers.findIndex((m) => m.isLeader);
      if (localIndex < 0) localIndex = 0;

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
        const skin = isLocal
          ? selectedCardSkin
          : CARD_SKINS[(index + 1) % CARD_SKINS.length] ?? selectedCardSkin;

        return {
          name: memberName,
          tag: memberTag ? `#${memberTag}` : "",
          role: formatPosition(
            member.firstPositionPreference || member.secondPositionPreference,
          ),
          rank: isLocal ? playerRank : "Party Member",
          lp: isLocal ? playerLp : "In Lobby",
          status: member.isLeader || isLocal ? "leader" : "ready",
          accent: isLocal ? selectedCardSkin.accent : accents[index] ?? "blue",
          cardSkin: skin.id,
          isLocal,
        };
      };

      const localMember = lobbyMembers[localIndex] ?? localLobbyMember ?? lobbyMembers[0];
      if (localMember) emptySlots[2] = memberToSlot(localMember, 0, true);

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
        isLocal: true,
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

  // -------------------------------------------------------------------------
  // Actions — every window.bonkClient call lives here.
  // -------------------------------------------------------------------------

  const loadAccount = useCallback(async () => {
    try {
      setAccountStatus("Loading account...");
      const riotAccount = await window.bonkClient.getAccount();
      setAccount(riotAccount);
      setAccountStatus("League account connected");
    } catch (error) {
      console.error(error);
      setAccountStatus(error instanceof Error ? error.message : "Account failed");
    }
  }, []);

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

  const selectLeagueFolder = useCallback(async () => {
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
  }, [checkLeagueClient]);

  const launchLeagueClient = useCallback(async () => {
    try {
      setActionStatus("Launching League client...");
      const status = await window.bonkClient.launchLeagueClient();
      setLeagueClientStatus(status);
      setActionStatus(status.message);
      await checkLeagueClient();
      if (status.connected) void loadRankedProfile();
    } catch (error) {
      console.error(error);
      setActionStatus("Could not launch League client");
    }
  }, [checkLeagueClient, loadRankedProfile]);

  const createLeagueLobby = useCallback(
    async (queueId: number) => {
      const queue = QUEUE_OPTIONS.find((option) => option.queueId === queueId);
      const label = queue?.label ?? `Queue ${queueId}`;
      const knownQueue = findKnownQueue(queueId);

      setSelectedQueueId(queueId);

      if (
        queue?.disabledReason ||
        (knownGameQueues.length > 0 &&
          (!knownQueue ||
            knownQueue.enabled === false ||
            knownQueue.isAvailable === false))
      ) {
        setActionStatus(queue?.disabledReason ?? `${label} is unavailable`);
        return;
      }

      if (isInLeagueLobby && currentQueueId === queueId) {
        setActionStatus(`${label} lobby already open`);
        return;
      }

      try {
        setActionStatus(
          isInLeagueLobby ? `Switching to ${label}...` : `Creating ${label} lobby...`,
        );
        const overview = await window.bonkClient.createLeagueLobby(queueId);
        setLeagueOverview(overview);
        setLeagueClientStatus(overview.status);
        setActionStatus(`${label} lobby ready`);

        // Apply the current role choice to the fresh lobby. Position-less
        // queues (ARAM, Arena, blind) reject this — that's fine, we ignore it.
        try {
          const withRoles = await window.bonkClient.setRolePreferences(
            ROLE_TO_POSITION[selectedRole] ?? "UNSELECTED",
            ROLE_TO_POSITION[selectedSecondaryRole] ?? "UNSELECTED",
          );
          setLeagueOverview(withRoles);
          setLeagueClientStatus(withRoles.status);
        } catch {
          // Queue has no positions; nothing to sync.
        }
      } catch (error) {
        console.error(error);
        setActionStatus("Could not create lobby");
      }
    },
    [currentQueueId, findKnownQueue, isInLeagueLobby, knownGameQueues.length, selectedRole, selectedSecondaryRole],
  );

  const startQueue = useCallback(async () => {
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
  }, [isInLeagueLobby]);

  const cancelQueue = useCallback(async () => {
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
  }, []);

  const handleQueueButton = useCallback(async () => {
    if (isInMatchmaking && !isReadyCheckActive) {
      await cancelQueue();
      return;
    }
    if (isInLeagueLobby) {
      await startQueue();
      return;
    }
    await createLeagueLobby(selectedQueueId);
  }, [
    cancelQueue,
    createLeagueLobby,
    isInLeagueLobby,
    isInMatchmaking,
    isReadyCheckActive,
    selectedQueueId,
    startQueue,
  ]);

  // Click-to-hover (no separate hover button): completed=false hovers the champ.
  const hoverChampion = useCallback(
    async (championId: number) => {
      setSelectedChampionId(championId);
      if (sandboxRef.current) {
        setActionStatus("Sandbox: hovering champion");
        return;
      }
      if (!hoverAction) {
        setActionStatus("You can't declare a champion in this phase");
        return;
      }
      try {
        setActionStatus("Hovering champion...");
        const overview = await window.bonkClient.champSelectAction(hoverAction.id, {
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
    },
    [hoverAction],
  );

  // Lock In / Ban — completes the current action.
  const lockInChampion = useCallback(async () => {
    if (!completableAction || !activeChampionId) {
      setActionStatus(
        activeChampionId ? "Wait for your turn to lock in" : "Select a champion first",
      );
      return;
    }
    if (sandboxRef.current) {
      // Lock into the mock session so the preview persists.
      setLeagueOverview((previous) => {
        if (!previous?.champSelect) return previous;
        const session = previous.champSelect.session;
        return {
          ...previous,
          champSelect: {
            ...previous.champSelect,
            session: {
              ...session,
              myTeam: (session.myTeam ?? []).map((player) =>
                player.cellId === session.localPlayerCellId
                  ? { ...player, championId: activeChampionId }
                  : player,
              ),
              actions: (session.actions ?? []).map((group) =>
                group.map((action) =>
                  action.id === completableAction.id
                    ? { ...action, championId: activeChampionId, completed: true, isInProgress: false }
                    : action,
                ),
              ),
            },
          },
        };
      });
      setActionStatus(localActionType === "ban" ? "Sandbox: banned" : "Sandbox: locked in");
      return;
    }
    try {
      setActionStatus(localActionType === "ban" ? "Locking ban..." : "Locking pick...");
      const overview = await window.bonkClient.champSelectAction(completableAction.id, {
        championId: activeChampionId,
        completed: true,
      });
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus("Action locked");
    } catch (error) {
      console.error(error);
      setActionStatus("Champ select action failed");
    }
  }, [activeChampionId, completableAction, localActionType]);

  // Push role preferences to the live lobby (Rift draft/ranked only — other
  // queues have no positions and reject this, which we surface gently).
  const pushRolePreferences = useCallback(
    async (primary: string, secondary: string) => {
      if (!isInLeagueLobby) return;
      try {
        const overview = await window.bonkClient.setRolePreferences(
          ROLE_TO_POSITION[primary] ?? "UNSELECTED",
          ROLE_TO_POSITION[secondary] ?? "UNSELECTED",
        );
        setLeagueOverview(overview);
        setLeagueClientStatus(overview.status);
        setActionStatus("Roles updated");
      } catch (error) {
        console.error(error);
        setActionStatus("This queue doesn't use roles");
      }
    },
    [isInLeagueLobby],
  );

  const changePrimaryRole = useCallback(
    (role: string) => {
      setSelectedRole(role);
      // Can't have the same primary and secondary (unless Fill) — bump secondary.
      const nextSecondary =
        role === selectedSecondaryRole && role !== "Fill" ? "Fill" : selectedSecondaryRole;
      if (nextSecondary !== selectedSecondaryRole) setSelectedSecondaryRole(nextSecondary);
      void pushRolePreferences(role, nextSecondary);
    },
    [pushRolePreferences, selectedSecondaryRole],
  );

  const changeSecondaryRole = useCallback(
    (role: string) => {
      const nextPrimary =
        role === selectedRole && role !== "Fill" ? "Fill" : selectedRole;
      if (nextPrimary !== selectedRole) setSelectedRole(nextPrimary);
      setSelectedSecondaryRole(role);
      void pushRolePreferences(nextPrimary, role);
    },
    [pushRolePreferences, selectedRole],
  );

  const selectRunePage = useCallback(async (pageId: number) => {
    if (sandboxRef.current) {
      setLeagueOverview((previous) => {
        if (!previous?.champSelect) return previous;
        const pages = previous.champSelect.runePages.map((page) => ({
          ...page,
          current: page.id === pageId,
        }));
        return {
          ...previous,
          champSelect: {
            ...previous.champSelect,
            runePages: pages,
            currentRunePage: pages.find((page) => page.id === pageId) ?? null,
          },
        };
      });
      setActionStatus("Sandbox: rune page selected");
      return;
    }
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
  }, []);

  const setSkin = useCallback(async (selectedSkinId: number) => {
    if (sandboxRef.current) {
      setLeagueOverview((previous) => {
        if (!previous?.champSelect) return previous;
        const session = previous.champSelect.session;
        return {
          ...previous,
          champSelect: {
            ...previous.champSelect,
            session: {
              ...session,
              myTeam: (session.myTeam ?? []).map((player) =>
                player.cellId === session.localPlayerCellId
                  ? { ...player, selectedSkinId }
                  : player,
              ),
            },
          },
        };
      });
      setActionStatus("Sandbox: skin selected");
      return;
    }
    try {
      setActionStatus("Selecting skin...");
      const overview = await window.bonkClient.setSkin(selectedSkinId);
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus("Skin selected");
    } catch (error) {
      console.error(error);
      setActionStatus("Could not select skin");
    }
  }, []);

  const setSummonerSpells = useCallback(
    async (spell1Id: number, spell2Id: number) => {
      if (sandboxRef.current) {
        setLeagueOverview((previous) => {
          if (!previous?.champSelect) return previous;
          const session = previous.champSelect.session;
          return {
            ...previous,
            champSelect: {
              ...previous.champSelect,
              session: {
                ...session,
                myTeam: (session.myTeam ?? []).map((player) =>
                  player.cellId === session.localPlayerCellId
                    ? { ...player, spell1Id, spell2Id }
                    : player,
                ),
              },
            },
          };
        });
        setActionStatus("Sandbox: summoner spells set");
        return;
      }
      try {
        setActionStatus("Setting summoner spells...");
        const overview = await window.bonkClient.setSummonerSpells(spell1Id, spell2Id);
        setLeagueOverview(overview);
        setLeagueClientStatus(overview.status);
        setActionStatus("Summoner spells set");
      } catch (error) {
        console.error(error);
        setActionStatus("Could not set summoner spells");
      }
    },
    [],
  );

  const applyRunePage = useCallback(async (page: LeagueRunePage) => {
    if (sandboxRef.current) {
      setActionStatus("Sandbox: recommended runes applied");
      return;
    }
    try {
      setActionStatus("Applying rune page...");
      const overview = await window.bonkClient.applyRunePage(page);
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus("Rune page applied");
    } catch (error) {
      console.error(error);
      setActionStatus("Could not apply rune page");
    }
  }, []);

  const saveRunePage = useCallback(async (page: LeagueRunePage) => {
    if (sandboxRef.current) {
      setActionStatus("Sandbox: rune page saved (preview only)");
      return;
    }
    try {
      setActionStatus("Saving rune page...");
      const overview = await window.bonkClient.saveRunePage(page);
      setLeagueOverview(overview);
      setLeagueClientStatus(overview.status);
      setActionStatus("Rune page saved");
    } catch (error) {
      console.error(error);
      setActionStatus("Could not save rune page");
    }
  }, []);

  const loadMatchDetail = useCallback(
    async (gameId: number) => {
      setMatchDetails((previous) => {
        if (previous[gameId] && previous[gameId] !== "error") return previous;
        return { ...previous, [gameId]: "loading" };
      });
      try {
        const detail = await window.bonkClient.getMatchDetail(gameId);
        setMatchDetails((previous) => ({
          ...previous,
          [gameId]: detail ?? "error",
        }));
      } catch (error) {
        console.error(error);
        setMatchDetails((previous) => ({ ...previous, [gameId]: "error" }));
      }
    },
    [],
  );

  const loadStore = useCallback(async () => {
    setStoreLoading(true);
    try {
      const data = await window.bonkClient.getStore();
      setStore(data);
    } catch (error) {
      console.error(error);
      setActionStatus("Could not load store");
    } finally {
      setStoreLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await window.bonkClient.getProfile();
      setProfile(data);
      profileLoadedRef.current = true;
    } catch (error) {
      console.error(error);
      setActionStatus("Could not load profile");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const honorPlayer = useCallback(
    async (summonerId: number) => {
      // Hide the ballot immediately so it doesn't flicker while the call lands.
      setDismissedBallotGameId(honorBallot?.gameId ?? -1);
      try {
        setActionStatus(summonerId > 0 ? "Honoring teammate..." : "Skipping honor...");
        const overview = await window.bonkClient.honorPlayer(summonerId);
        setLeagueOverview(overview);
        setLeagueClientStatus(overview.status);
        setActionStatus(summonerId > 0 ? "Honor sent" : "Honor skipped");
      } catch (error) {
        console.error(error);
        setActionStatus("Could not send honor");
      }
    },
    [honorBallot?.gameId],
  );

  const setProfileIcon = useCallback(
    async (iconId: number) => {
      try {
        setActionStatus("Updating profile icon...");
        const overview = await window.bonkClient.setProfileIcon(iconId);
        setLeagueOverview(overview);
        setLeagueClientStatus(overview.status);
        setActionStatus("Profile icon updated");
        // Reflect the new icon in the loaded profile too.
        setProfile((previous) =>
          previous?.summoner
            ? { ...previous, summoner: { ...previous.summoner, profileIconId: iconId } }
            : previous,
        );
      } catch (error) {
        console.error(error);
        setActionStatus("Could not update profile icon");
      }
    },
    [],
  );

  const loadCollection = useCallback(async () => {
    setCollectionLoading(true);
    try {
      const data = await window.bonkClient.getCollection();
      setCollection(data);
    } catch (error) {
      console.error(error);
      setActionStatus("Could not load collection");
    } finally {
      setCollectionLoading(false);
    }
  }, []);

  const acceptReadyCheck = useCallback(async () => {
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
  }, []);

  const declineReadyCheck = useCallback(async () => {
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
  }, []);

  const exitApp = useCallback(async () => {
    await window.bonkClient.exitApp();
  }, []);

  const inviteFriend = useCallback(
    async (summonerId: number | undefined, name: string) => {
      if (!summonerId) {
        setActionStatus(`${name} can't be invited (no summoner id)`);
        return;
      }
      try {
        setActionStatus(`Inviting ${name}...`);
        const overview = await window.bonkClient.inviteToLobby(summonerId, selectedQueueId);
        setLeagueOverview(overview);
        setLeagueClientStatus(overview.status);
        setActionStatus(`Invited ${name}`);
      } catch (error) {
        console.error(error);
        setActionStatus(`Could not invite ${name}`);
      }
    },
    [selectedQueueId],
  );

  const enterSandbox = useCallback(() => {
    sandboxRef.current = true;
    setSandbox(true);
    setSelectedChampionId(null);
    setLeagueOverview(createSandboxOverview());
    setActionStatus("Sandbox: champion select");
    // Pull real rune trees + perk pictures from League (if it's open) so the
    // rune editor renders with real data instead of placeholders.
    window.bonkClient
      .getRuneData()
      .then((data) => {
        if (!sandboxRef.current || !data) return;
        setLeagueOverview((previous) => {
          if (!previous?.champSelect) return previous;
          return {
            ...previous,
            champSelect: {
              ...previous.champSelect,
              perkStyles: data.perkStyles?.length
                ? data.perkStyles
                : previous.champSelect.perkStyles,
              perks: data.perks?.length ? data.perks : previous.champSelect.perks,
              summonerSpells: data.summonerSpells?.length
                ? data.summonerSpells
                : previous.champSelect.summonerSpells,
            },
          };
        });
      })
      .catch(() => {
        // League not open — keep the placeholder data.
      });
  }, []);

  const exitSandbox = useCallback(() => {
    sandboxRef.current = false;
    setSandbox(false);
    setSelectedChampionId(null);
    setActionStatus("Left sandbox");
    void checkLeagueClient();
  }, [checkLeagueClient]);

  // -------------------------------------------------------------------------
  // Effects — boot + 2s poll, auto-accept guard, queue clock, queue sync.
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const bootClient = async () => {
      try {
        setActionStatus("Launching League client...");
        const status = await window.bonkClient.launchLeagueClient();
        if (cancelled) return;
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
      if (!sandboxRef.current) void checkLeagueClient();
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
    if (isInMatchmaking && queueStartedAt === null) setQueueStartedAt(Date.now());
    if (!isInMatchmaking && queueStartedAt !== null) setQueueStartedAt(null);
  }, [isInMatchmaking, queueStartedAt]);

  // Record when each overview arrives so timers can interpolate from it.
  useEffect(() => {
    overviewAtRef.current = Date.now();
    setClockNow(Date.now());
  }, [leagueOverview]);

  // When a match ends (gameflow leaves the in-game phases), auto-refresh the
  // ranked + profile data so LP / match history update without a manual pull.
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = gameflowPhase;
    if (!gameflowPhase || prev === gameflowPhase) return;
    const leftGame =
      prev != null && GAME_ACTIVE_PHASES.includes(prev) && !GAME_ACTIVE_PHASES.includes(gameflowPhase);
    if (leftGame) {
      void loadRankedProfile();
      if (profileLoadedRef.current) void loadProfile();
    }
  }, [gameflowPhase, loadRankedProfile, loadProfile]);

  // Pull the real position preferences set in the League lobby into the role
  // selector — on load and whenever they change in the client.
  useEffect(() => {
    const first = localLobbyMember?.firstPositionPreference;
    const second = localLobbyMember?.secondPositionPreference;

    if (!localLobbyMember) {
      syncedFirstPrefRef.current = null;
      syncedSecondPrefRef.current = null;
      return;
    }
    if (first && first !== syncedFirstPrefRef.current) {
      syncedFirstPrefRef.current = first;
      const role = POSITION_TO_ROLE[String(first).toUpperCase()];
      if (role) setSelectedRole(role);
    }
    if (second && second !== syncedSecondPrefRef.current) {
      syncedSecondPrefRef.current = second;
      const role = POSITION_TO_ROLE[String(second).toUpperCase()];
      if (role) setSelectedSecondaryRole(role);
    }
  }, [
    localLobbyMember,
    localLobbyMember?.firstPositionPreference,
    localLobbyMember?.secondPositionPreference,
  ]);

  // Fast local tick so timers move smoothly between the 2s polls.
  useEffect(() => {
    const needsTick =
      isInMatchmaking || isReadyCheckActive || isChampSelectActive || penaltySecondsRemaining > 0;
    if (!needsTick) return undefined;
    const intervalId = window.setInterval(() => setClockNow(Date.now()), 200);
    return () => window.clearInterval(intervalId);
  }, [isInMatchmaking, isReadyCheckActive, isChampSelectActive, penaltySecondsRemaining]);

  useEffect(() => {
    if (!autoAccept || !canRespondToReadyCheck || autoAcceptingRef.current) return;
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
    const currentQueue = QUEUE_OPTIONS.find((queue) => queue.queueId === currentQueueId);
    if (currentQueue) setSelectedQueueId(currentQueue.queueId);
  }, [currentQueueId]);

  // Reset transient champ pick when champ select ends.
  useEffect(() => {
    if (!isChampSelectActive) setSelectedChampionId(null);
  }, [isChampSelectActive]);

  return {
    // raw state
    account,
    rankedProfile,
    accountStatus,
    leagueClientStatus,
    leagueOverview,
    champSelect,

    // selections
    selectedQueueId,
    setSelectedQueueId,
    selectedRole,
    setSelectedRole,
    selectedSecondaryRole,
    setSelectedSecondaryRole,
    changePrimaryRole,
    changeSecondaryRole,
    selectedCardSkinId,
    setSelectedCardSkinId,
    selectedCardSkin,
    actionStatus,
    setActionStatus,
    autoAccept,
    setAutoAccept,

    // derived rank
    soloQueue,
    playerRank,
    playerLp,
    playerWins,
    playerLosses,
    playerWinRate,

    // derived lobby/queue
    lobby,
    isInLeagueLobby,
    currentQueueId,
    knownGameQueues,
    findKnownQueue,
    isInMatchmaking,
    queueElapsedLabel,
    queueRestriction,
    penaltySecondsRemaining,

    // ready check
    readyCheck,
    isReadyCheckActive,
    canRespondToReadyCheck,
    readyCheckSeconds,
    readyCheckProgress,

    // champ select
    isChampSelectActive,
    champSelectSession,
    localPlayerCellId,
    localAction,
    localActionType,
    localActions,
    canLock,
    activeChampionId,
    selectedChampionId,
    setSelectedChampionId,
    selectedChampion,
    championById,
    takenChampionIds,
    bannedChampionIds,
    phaseTimeLeft,
    phaseProgress,
    localSpell1Id,
    localSpell2Id,
    summonerSpells,
    recommendedRunePages,
    skinCarousel,
    localSelectedSkinId,

    // friends
    getFriends,

    // actions
    loadAccount,
    loadRankedProfile,
    checkLeagueClient,
    selectLeagueFolder,
    launchLeagueClient,
    createLeagueLobby,
    handleQueueButton,
    hoverChampion,
    lockInChampion,
    selectRunePage,
    setSummonerSpells,
    setSkin,
    applyRunePage,
    saveRunePage,
    acceptReadyCheck,
    declineReadyCheck,
    exitApp,
    inviteFriend,
    sandbox,
    enterSandbox,
    exitSandbox,
    collection,
    collectionLoading,
    loadCollection,
    profile,
    profileLoading,
    loadProfile,
    setProfileIcon,
    matchDetails,
    loadMatchDetail,
    store,
    storeLoading,
    loadStore,
    gameflowPhase,
    honorBallot: activeHonorBallot,
    honorPlayer,
    currentSummoner: leagueOverview?.currentSummoner ?? null,
  };
}
