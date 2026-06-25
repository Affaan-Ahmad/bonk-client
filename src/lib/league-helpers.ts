import type { ChampionSummary, FriendStatus, RoleName } from "@/types/league";

// ---------------------------------------------------------------------------
// Assets — protocol URLs are runtime strings only (never in CSS).
// ---------------------------------------------------------------------------

export function championIconSrc(championId?: number | null) {
  return championId && championId > 0
    ? `bonk-lcu://champion-icons/${championId}.png`
    : "";
}

export function championInitial(champion?: ChampionSummary | null) {
  return champion?.name?.slice(0, 1) ?? "?";
}

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

export function formatFriendStatus(friend: LeagueFriend): FriendStatus {
  const gameStatus = friend.lol?.gameStatus?.toLowerCase();
  const availability = friend.availability?.toLowerCase();

  if (availability === "offline" || !availability) return "Offline";
  if (gameStatus && gameStatus !== "outofgame") return "In Game";
  if (availability === "away" || availability === "dnd") return "Away";
  return "Online";
}

export function statusPriority(status: FriendStatus) {
  return { Online: 0, "In Game": 1, Away: 2, Offline: 3 }[status];
}

// ---------------------------------------------------------------------------
// Rank / queue formatting
// ---------------------------------------------------------------------------

export function formatTier(tier?: string, rank?: string) {
  if (!tier || !rank) return "Unranked";
  return `${tier.charAt(0)}${tier.slice(1).toLowerCase()} ${rank}`;
}

export function formatPosition(position?: string): RoleName {
  const positions: Record<string, RoleName> = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MIDDLE: "Mid",
    BOTTOM: "Bot",
    UTILITY: "Support",
    UNSELECTED: "Fill",
  };
  return positions[position ?? ""] ?? "Fill";
}

export function formatQueueName(queueId?: number) {
  const queues: Record<number, string> = {
    400: "Draft Pick",
    420: "Ranked Solo / Duo",
    430: "Normal Blind",
    440: "Ranked Flex",
    450: "ARAM",
    480: "Swiftplay",
    700: "Clash",
    900: "Practice Tool",
    1700: "Arena",
  };
  return queueId ? queues[queueId] ?? `Queue ${queueId}` : "Current Lobby";
}

export function getQueueId(queue: LeagueGameQueue) {
  const queueId = queue.queueId ?? queue.id;
  return typeof queueId === "string" ? Number(queueId) : queueId;
}

export function isQueueAvailable(queue?: LeagueGameQueue) {
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

export function getQueueDisabledReason(queue?: LeagueGameQueue) {
  if (!queue) return "Unavailable";
  return queue.queueAvailability ?? queue.availability ?? queue.status ?? "Unavailable";
}

// ---------------------------------------------------------------------------
// Matchmaking + ready check
// ---------------------------------------------------------------------------

export function isMatchmakingActive(search?: LeagueMatchmakingSearch | null) {
  if (!search) return false;
  const state = String(
    search.searchState ?? search.state ?? search.status ?? "",
  ).toLowerCase();

  return (
    (state.includes("search") ||
      state.includes("finding") ||
      state.includes("waiting") ||
      state.includes("found") ||
      state.includes("inprogress")) &&
    !state.includes("invalid") &&
    !state.includes("cancel") &&
    !state.includes("error")
  );
}

export function formatReadyCheckTimer(timer?: number | null) {
  const numericTimer = Number(timer);
  if (!Number.isFinite(numericTimer)) return null;
  return Math.max(0, Math.ceil(numericTimer > 1000 ? numericTimer / 1000 : numericTimer));
}

export function formatElapsedTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function getLeagueQueueElapsedSeconds(search?: LeagueMatchmakingSearch | null) {
  if (!search) return null;
  const rawSeconds = search.timeInQueueSeconds ?? search.timeInQueue;
  const numericSeconds = Number(rawSeconds);
  if (!Number.isFinite(numericSeconds)) return null;
  return numericSeconds > 1000
    ? Math.floor(numericSeconds / 1000)
    : Math.floor(numericSeconds);
}

// ---------------------------------------------------------------------------
// Champ select
// ---------------------------------------------------------------------------

export function flattenChampSelectActions(session?: LeagueChampSelectSession | null) {
  return session?.actions?.flat() ?? [];
}

// LCU often leaves session.bans.* empty; the reliable source of truth is the
// completed ban actions, grouped by which team the actor cell belongs to.
export function resolveChampSelectBans(session?: LeagueChampSelectSession | null) {
  const myCells = new Set((session?.myTeam ?? []).map((player) => Number(player.cellId)));
  const myTeamBans: number[] = [];
  const theirTeamBans: number[] = [];

  for (const action of flattenChampSelectActions(session)) {
    if (String(action.type ?? "").toLowerCase() !== "ban") continue;
    if (!action.completed) continue;
    const championId = Number(action.championId);
    if (!Number.isInteger(championId) || championId <= 0) continue;

    if (myCells.has(Number(action.actorCellId))) myTeamBans.push(championId);
    else theirTeamBans.push(championId);
  }

  const sessionMy = session?.bans?.myTeamBans ?? [];
  const sessionTheir = session?.bans?.theirTeamBans ?? [];

  return {
    myTeamBans: [...new Set([...myTeamBans, ...sessionMy])].filter((id) => Number(id) > 0),
    theirTeamBans: [...new Set([...theirTeamBans, ...sessionTheir])].filter((id) => Number(id) > 0),
  };
}

export function phaseLabel(phase?: string) {
  const labels: Record<string, string> = {
    BAN_PICK: "Ban / Pick",
    BAN_PICK_TURN: "Your Turn",
    FINALIZATION: "Finalizing",
    PLANNING: "Planning",
    GAME_STARTING: "Game Starting",
  };
  return labels[phase ?? ""] ?? phase ?? "Waiting";
}

export function formatPhaseTimer(milliseconds?: number) {
  const numeric = Number(milliseconds);
  if (!Number.isFinite(numeric)) return "--";
  return String(Math.max(0, Math.ceil(numeric / 1000))).padStart(2, "0");
}

export function isLocalChampAction(
  action: LeagueChampSelectAction,
  localPlayerCellId?: number,
) {
  const actionType = String(action.type ?? "").toLowerCase();
  return (
    Number(action.actorCellId) === Number(localPlayerCellId) &&
    (actionType === "pick" || actionType === "ban")
  );
}

export function sameText(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}
