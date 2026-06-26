// Dev sandbox — a realistic fake champ-select session so the ChampionSelectScreen
// can be previewed and iterated on without queueing a real game.

const SANDBOX_CHAMPIONS: LeagueChampionSummary[] = [
  { id: 24, name: "Jax" },
  { id: 64, name: "Lee Sin" },
  { id: 103, name: "Ahri" },
  { id: 157, name: "Yasuo" },
  { id: 222, name: "Jinx" },
  { id: 51, name: "Caitlyn" },
  { id: 89, name: "Leona" },
  { id: 412, name: "Thresh" },
  { id: 238, name: "Zed" },
  { id: 91, name: "Talon" },
  { id: 245, name: "Ekko" },
  { id: 84, name: "Akali" },
  { id: 7, name: "LeBlanc" },
  { id: 99, name: "Lux" },
  { id: 117, name: "Lulu" },
  { id: 40, name: "Janna" },
  { id: 22, name: "Ashe" },
  { id: 67, name: "Vayne" },
  { id: 142, name: "Zoe" },
  { id: 875, name: "Sett" },
  { id: 555, name: "Pyke" },
  { id: 246, name: "Qiyana" },
  { id: 1, name: "Annie" },
  { id: 134, name: "Syndra" },
  { id: 55, name: "Katarina" },
  { id: 39, name: "Irelia" },
  { id: 121, name: "Kha'Zix" },
  { id: 254, name: "Vi" },
  { id: 105, name: "Fizz" },
];

const SANDBOX_PERK_STYLES: LeaguePerkStyle[] = [
  { id: 8000, name: "Precision" },
  { id: 8100, name: "Domination" },
  { id: 8200, name: "Sorcery" },
  { id: 8400, name: "Resolve" },
  { id: 8300, name: "Inspiration" },
];

const SANDBOX_RUNE_PAGES: LeagueRunePage[] = [
  {
    id: 1,
    name: "Electrocute — Burst",
    current: true,
    isEditable: true,
    primaryStyleId: 8100,
    subStyleId: 8200,
    selectedPerkIds: [],
  },
  {
    id: 2,
    name: "Conqueror — Bruiser",
    current: false,
    isEditable: true,
    primaryStyleId: 8000,
    subStyleId: 8400,
    selectedPerkIds: [],
  },
  {
    id: 3,
    name: "First Strike — Tempo",
    current: false,
    isEditable: true,
    primaryStyleId: 8300,
    subStyleId: 8200,
    selectedPerkIds: [],
  },
];

export function createSandboxOverview(): LeagueOverview {
  const session: LeagueChampSelectSession = {
    localPlayerCellId: 0,
    myTeam: [
      { cellId: 0, assignedPosition: "MIDDLE", spell1Id: 4, spell2Id: 14 },
      { cellId: 1, championId: 64, assignedPosition: "JUNGLE" },
      { cellId: 2, championId: 24, assignedPosition: "TOP" },
      { cellId: 3, championId: 222, assignedPosition: "BOTTOM" },
      { cellId: 4, championId: 412, assignedPosition: "UTILITY" },
    ],
    theirTeam: [
      { cellId: 5, assignedPosition: "TOP" },
      { cellId: 6, assignedPosition: "JUNGLE" },
      { cellId: 7, assignedPosition: "MIDDLE" },
      { cellId: 8, assignedPosition: "BOTTOM" },
      { cellId: 9, assignedPosition: "UTILITY" },
    ],
    bans: {
      myTeamBans: [238, 84],
      theirTeamBans: [157, 245],
    },
    timer: {
      adjustedTimeLeftInPhase: 27000,
      totalTimeInPhase: 30000,
      internalNowInEpochMs: Date.now(),
      phase: "BAN_PICK",
    },
    actions: [
      [
        {
          id: 1,
          actorCellId: 0,
          type: "pick",
          isInProgress: true,
          completed: false,
          isAllyAction: true,
        },
      ],
    ],
  };

  return {
    status: {
      connected: true,
      status: "connected",
      message: "Sandbox mode",
      protocol: "sandbox",
      port: "0",
    },
    currentSummoner: { gameName: "Sandbox", tagLine: "DEV", summonerLevel: 420 },
    friends: [],
    lobby: null,
    gameQueues: [],
    readyCheck: null,
    matchmakingSearch: null,
    champSelect: {
      session,
      pickableChampionIds: SANDBOX_CHAMPIONS.map((champion) => champion.id),
      bannableChampionIds: SANDBOX_CHAMPIONS.map((champion) => champion.id),
      champions: SANDBOX_CHAMPIONS,
      runePages: SANDBOX_RUNE_PAGES,
      currentRunePage: SANDBOX_RUNE_PAGES[0],
      perkStyles: SANDBOX_PERK_STYLES,
      summonerSpells: [
        { id: 4, name: "Flash", gameModes: ["CLASSIC"] },
        { id: 14, name: "Ignite", gameModes: ["CLASSIC"] },
        { id: 12, name: "Teleport", gameModes: ["CLASSIC"] },
        { id: 7, name: "Heal", gameModes: ["CLASSIC"] },
        { id: 21, name: "Barrier", gameModes: ["CLASSIC"] },
        { id: 3, name: "Exhaust", gameModes: ["CLASSIC"] },
        { id: 6, name: "Ghost", gameModes: ["CLASSIC"] },
        { id: 1, name: "Cleanse", gameModes: ["CLASSIC"] },
        { id: 11, name: "Smite", gameModes: ["CLASSIC"] },
      ],
      recommendedRunePages: [
        {
          id: -1,
          name: "Recommended — Lethal Tempo",
          primaryStyleId: 8000,
          subStyleId: 8100,
          selectedPerkIds: [8008, 9111, 9104, 8014, 8135, 8105, 5005, 5008, 5001],
        },
        {
          id: -2,
          name: "Recommended — Fleet Footwork",
          primaryStyleId: 8000,
          subStyleId: 8200,
          selectedPerkIds: [8021, 9101, 9105, 8299, 8226, 8210, 5005, 5008, 5001],
        },
      ],
      perks: [],
      skinCarousel: [
        { id: 103000, name: "Ahri", isBase: true, unlocked: true },
        { id: 103001, name: "Dynasty Ahri", unlocked: true },
        { id: 103002, name: "Midnight Ahri", unlocked: false },
        { id: 103086, name: "K/DA Ahri", unlocked: true },
        { id: 103200, name: "Spirit Blossom Ahri", unlocked: false },
      ],
    },
    gameflowPhase: "ChampSelect",
    honorBallot: null,
  };
}
