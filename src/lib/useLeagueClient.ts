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
  formatReadyCheckTimer,
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
const ROLE_TO_POSITION: Record<string, string> = {
  Top: "TOP",
  Jungle: "JUNGLE",
  Mid: "MIDDLE",
  Bot: "BOTTOM",
  Support: "UTILITY",
  Fill: "FILL",
};

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
  const leagueQueueElapsedSeconds = getLeagueQueueElapsedSeconds(matchmakingSearch);
  const localQueueElapsedSeconds = queueStartedAt
    ? Math.floor((clockNow - queueStartedAt) / 1000)
    : 0;
  const queueElapsedSeconds = leagueQueueElapsedSeconds ?? localQueueElapsedSeconds;
  const queueElapsedLabel = formatElapsedTime(queueElapsedSeconds);

  // ----- derived: ready check -----
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

  // ----- derived: champ select -----
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
  const localSpell1Id = localPlayer?.spell1Id ?? null;
  const localSpell2Id = localPlayer?.spell2Id ?? null;
  const summonerSpells = champSelect?.summonerSpells ?? [];
  const recommendedRunePages = champSelect?.recommendedRunePages ?? [];
  const activeChampionId =
    selectedChampionId ?? localPlayer?.championId ?? localAction?.championId ?? null;

  const championById = useMemo(() => {
    const map = new Map<number, ChampionSummary>();
    champSelect?.champions.forEach((champion) => {
      if (champion.id > 0) map.set(champion.id, champion as ChampionSummary);
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
  const bannedChampionIds = useMemo(
    () =>
      new Set([
        ...(champSelectSession?.bans?.myTeamBans ?? []),
        ...(champSelectSession?.bans?.theirTeamBans ?? []),
      ]),
    [champSelectSession],
  );
  const selectedChampion = activeChampionId
    ? championById.get(activeChampionId) ?? null
    : null;

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
      if (!localAction) {
        setActionStatus("Wait for your turn to pick");
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
    },
    [localAction],
  );

  // Lock In / Ban — completes the current action.
  const lockInChampion = useCallback(async () => {
    if (!localAction || !activeChampionId) {
      setActionStatus("Select a champion first");
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
                  action.id === localAction.id
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
      const overview = await window.bonkClient.champSelectAction(localAction.id, {
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
  }, [activeChampionId, localAction, localActionType]);

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

  useEffect(() => {
    if (!isInMatchmaking) return undefined;
    const intervalId = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [isInMatchmaking]);

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
    activeChampionId,
    selectedChampionId,
    setSelectedChampionId,
    selectedChampion,
    championById,
    availableChampionSet,
    bannedChampionIds,
    phaseTimeLeft,
    phaseProgress,
    localSpell1Id,
    localSpell2Id,
    summonerSpells,
    recommendedRunePages,

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
    applyRunePage,
    acceptReadyCheck,
    declineReadyCheck,
    exitApp,
    inviteFriend,
    sandbox,
    enterSandbox,
    exitSandbox,
  };
}
