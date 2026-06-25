// Frontend-only view-model types.
//
// The bridge/domain types (LeagueOverview, LeagueFriend, LeagueChampSelectSession,
// RiotAccount, etc.) are declared as AMBIENT GLOBALS in `src/vite-env.d.ts` and are
// available everywhere without import. Do not redeclare them here — that file is the
// single source of truth for the `window.bonkClient` contract.

export type FriendStatus = "Online" | "In Game" | "Away" | "Offline";

export type RoleName = "Top" | "Jungle" | "Mid" | "Bot" | "Support" | "Fill";

export type ModeCategory = "rift" | "aram" | "alternate" | "tft";

export type CardAccent = "gold" | "blue" | "teal" | "violet" | "green" | "empty";

export type LobbySlotStatus = "leader" | "ready" | "empty";

export type QueueOption = {
  label: string;
  queueId: number;
  category: ModeCategory;
  note?: string;
  description: string;
  disabledReason?: string;
};

export type CardSkin = {
  id: string;
  name: string;
  rarity: "Legendary" | "Epic" | "Rare";
  accent: CardAccent;
  description: string;
};

export type LobbySlot = {
  name: string;
  tag: string;
  role: string;
  rank: string;
  lp: string;
  status: LobbySlotStatus;
  accent: CardAccent;
  cardSkin: string;
  isLocal: boolean;
};

export type FriendView = {
  name: string;
  status: FriendStatus;
  rank: string;
  summonerId?: number;
};

// `LeagueChampionSummary` is ambient-global; this narrows the fields we rely on.
export type ChampionSummary = LeagueChampionSummary & { id: number; name: string };

export type RankedProfile = Awaited<
  ReturnType<Window["bonkClient"]["getRankedProfile"]>
>;

export type NavItem =
  | "Home"
  | "Play"
  | "Collection"
  | "Profile"
  | "Store"
  | "Settings";
