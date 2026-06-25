import type {
  CardSkin,
  ModeCategory,
  NavItem,
  QueueOption,
  RoleName,
} from "@/types/league";

export const READY_CHECK_TOTAL_SECONDS = 10;

export const NAV_ITEMS: NavItem[] = [
  "Home",
  "Play",
  "Collection",
  "Profile",
  "Store",
  "Settings",
];

export const ROLES: RoleName[] = ["Top", "Jungle", "Mid", "Bot", "Support", "Fill"];

// Jax = championId 24. Splash served by the bonk-lcu protocol handler in main.cjs.
// NOTE: this string only ever lives in TS at runtime — never inside a .css file —
// so Vite's build never tries to resolve the custom protocol.
export const SCENE_SPLASH_URL = "bonk-lcu://champion-splashes/24/24000.jpg";

export const CARD_SKINS: CardSkin[] = [
  {
    id: "neon-green",
    name: "Neon Green",
    rarity: "Legendary",
    accent: "green",
    description: "Signature Spotify-green frame with a live energy edge.",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    rarity: "Epic",
    accent: "blue",
    description: "Matte black frame with cool steel lighting.",
  },
  {
    id: "arcane-violet",
    name: "Arcane Violet",
    rarity: "Epic",
    accent: "violet",
    description: "Deep violet frame with arcane glow.",
  },
  {
    id: "gold-prestige",
    name: "Gold Prestige",
    rarity: "Legendary",
    accent: "gold",
    description: "Polished gold frame for ranked flexing.",
  },
  {
    id: "jadeguard",
    name: "Jadeguard",
    rarity: "Rare",
    accent: "teal",
    description: "Clean teal frame for support mains.",
  },
];

export const MODE_CATEGORIES: { id: ModeCategory; eyebrow: string; title: string }[] = [
  { id: "rift", eyebrow: "5v5", title: "Summoner's Rift" },
  { id: "aram", eyebrow: "5v5", title: "ARAM" },
  { id: "alternate", eyebrow: "Rotating", title: "Alternate" },
  { id: "tft", eyebrow: "FFA", title: "Teamfight Tactics" },
];

export const QUEUE_OPTIONS: QueueOption[] = [
  {
    label: "Ranked Solo/Duo",
    queueId: 420,
    category: "rift",
    note: "Climb",
    description: "Climb the ladder alone or with one trusted duo.",
  },
  {
    label: "Draft Pick",
    queueId: 400,
    category: "rift",
    description: "Classic PvP with bans, picks, and assigned roles.",
  },
  {
    label: "Swiftplay",
    queueId: 480,
    category: "rift",
    note: "Faster",
    description: "Shorter Rift matches with quick combat pacing.",
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
    note: "Solo",
    description: "Open a sandbox match for mechanics and builds.",
    disabledReason: "Practice lobby flow coming next",
  },
  {
    label: "Custom Game",
    queueId: 0,
    category: "rift",
    note: "Private",
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
    description: "Compact 2v2v2v2 skirmishes with rotating rules.",
  },
];
