/// <reference types="vite/client" />

type RiotAccount = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

type RiotSummoner = {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
};

type RiotRankedEntry = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

type LeagueClientStatus = {
  connected: boolean;
  status: "connected" | "not_open" | "invalid_lockfile";
  message: string;
  selected?: boolean;
  leagueFolderPath?: string;
  lockfilePath?: string;
  pid?: string;
  port?: string;
  protocol?: string;
  searchedPaths?: string[];
  searchedExecutablePaths?: string[];
  executablePath?: string;
  launched?: boolean;
  launchMethod?: string;
};

type LeagueSummoner = {
  displayName?: string;
  gameName?: string;
  tagLine?: string;
  summonerLevel?: number;
  profileIconId?: number;
};

type LeagueFriend = {
  id?: string;
  puuid?: string;
  summonerId?: number;
  name?: string;
  gameName?: string;
  gameTag?: string;
  tagLine?: string;
  availability?: string;
  product?: string;
  productName?: string;
  lol?: {
    gameStatus?: string;
  };
};

type LeagueLobbyMember = {
  puuid?: string;
  summonerId?: number;
  summonerName?: string;
  gameName?: string;
  tagLine?: string;
  firstPositionPreference?: string;
  secondPositionPreference?: string;
  isLeader?: boolean;
  isReady?: boolean;
};

type LeagueLobby = {
  gameConfig?: {
    queueId?: number;
    gameMode?: string;
    mapId?: number;
  };
  localMember?: LeagueLobbyMember;
  members?: LeagueLobbyMember[];
};

type LeagueGameQueue = {
  id?: number | string;
  queueId?: number | string;
  name?: string;
  description?: string;
  gameMode?: string;
  mapId?: number;
  queueAvailability?: string;
  availability?: string;
  status?: string;
  enabled?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  hideFromGameSelect?: boolean;
};

type LeagueReadyCheck = {
  state?: string;
  playerResponse?: string;
  timer?: number;
  readyCheckTimer?: number;
  timeLeft?: number;
  declinerIds?: number[];
  dodgeWarning?: string;
};

type LeagueMatchmakingSearch = {
  searchState?: string;
  state?: string;
  status?: string;
  estimatedQueueTime?: number;
  timeInQueue?: number;
  timeInQueueSeconds?: number;
  queueId?: number;
  isCurrentlyInQueue?: boolean;
  errors?: {
    errorType?: string;
    id?: number;
    message?: string;
    penalizedSummonerId?: number;
    penaltyTimeRemaining?: number;
  }[];
  lowPriorityData?: {
    penalizedSummonerIds?: number[];
    penaltyTime?: number;
    penaltyTimeRemaining?: number;
    reason?: string;
    bustedLeaverAccessToken?: string;
  };
};

type LeagueChampSelectAction = {
  id: number;
  actorCellId: number;
  championId?: number;
  completed?: boolean;
  isAllyAction?: boolean;
  isInProgress?: boolean;
  type: "pick" | "ban" | string;
};

type LeagueChampSelectPlayer = {
  cellId: number;
  championId?: number;
  selectedSkinId?: number;
  summonerId?: number;
  assignedPosition?: string;
  spell1Id?: number;
  spell2Id?: number;
};

type LeagueChampSelectSession = {
  actions?: LeagueChampSelectAction[][];
  bans?: {
    myTeamBans?: number[];
    theirTeamBans?: number[];
  };
  localPlayerCellId?: number;
  myTeam?: LeagueChampSelectPlayer[];
  theirTeam?: LeagueChampSelectPlayer[];
  timer?: {
    adjustedTimeLeftInPhase?: number;
    internalNowInEpochMs?: number;
    phase?: string;
    totalTimeInPhase?: number;
  };
};

type LeagueRankedEntry = {
  tier: string;
  division: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

type LeagueMasteryEntry = {
  championId: number;
  level: number;
  points: number;
};

type LeagueMatchSummary = {
  gameId: number;
  queueId?: number;
  gameMode?: string;
  gameCreation?: number;
  gameDuration?: number;
  championId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  champLevel: number;
  gold: number;
  damage: number;
  damageTaken: number;
  visionScore: number;
  wardsPlaced: number;
  largestMultiKill: number;
  items: { id: number; iconPath: string | null }[];
};

type LeagueStoreItem = {
  id: number;
  championId: number;
  name: string;
  tilePath: string | null;
  rp: number | null;
  be: number | null;
  sale: { cost: number; currency: string } | null;
};

type LeagueStoreData = {
  champions: LeagueStoreItem[];
  skins: LeagueStoreItem[];
  wallet: { rp: number; be: number };
};

type LeagueMatchPlayer = {
  teamId: number;
  championId: number;
  name: string;
  tagLine: string;
  isLocal: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  champLevel: number;
  spell1Id: number;
  spell2Id: number;
  items: { id: number; iconPath: string | null }[];
};

type LeagueMatchDetail = {
  gameId: number;
  gameDuration?: number;
  queueId?: number;
  allyTeam: { players: LeagueMatchPlayer[]; win: boolean };
  enemyTeam: { players: LeagueMatchPlayer[]; win: boolean };
};

type LeagueProfileData = {
  summoner: LeagueSummoner | null;
  rankedSolo: LeagueRankedEntry | null;
  rankedFlex: LeagueRankedEntry | null;
  mastery: LeagueMasteryEntry[];
  matches: LeagueMatchSummary[];
  ownedIconIds: number[];
};

type LeagueCollectionChampion = {
  id: number;
  name: string;
  alias?: string;
  squarePortraitPath?: string;
  roles: string[];
  owned: boolean;
};

type LeagueCollectionSkin = {
  id: number;
  championId: number;
  name: string;
  tilePath?: string;
  splashPath?: string;
  isBase: boolean;
  rarity?: string | null;
  owned: boolean;
};

type LeagueChampionSummary = {
  id: number;
  name: string;
  alias?: string;
  squarePortraitPath?: string;
  roles?: string[];
};

type LeagueRunePage = {
  id: number;
  name: string;
  current?: boolean;
  isEditable?: boolean;
  primaryStyleId?: number;
  subStyleId?: number;
  selectedPerkIds?: number[];
};

type LeaguePerkStyleSlot = {
  type?: string;
  slotLabel?: string;
  perks: number[];
};

type LeaguePerkStyle = {
  id: number;
  name: string;
  tooltip?: string;
  iconPath?: string;
  slots?: LeaguePerkStyleSlot[];
};

type LeaguePerk = {
  id: number;
  name: string;
  shortDesc?: string;
  longDesc?: string;
  iconPath?: string;
  tooltip?: string;
};

type LeagueSummonerSpell = {
  id: number;
  name: string;
  description?: string;
  summonerLevel?: number;
  gameModes?: string[];
  iconPath?: string;
};

type LeagueSkinCarouselSkin = {
  id: number;
  name: string;
  unlocked?: boolean;
  disabled?: boolean;
  ownership?: { owned?: boolean };
  isBase?: boolean;
  childSkins?: LeagueSkinCarouselSkin[];
};

type LeagueChampSelectOverview = {
  session: LeagueChampSelectSession;
  pickableChampionIds: number[];
  bannableChampionIds: number[];
  champions: LeagueChampionSummary[];
  runePages: LeagueRunePage[];
  currentRunePage: LeagueRunePage | null;
  perkStyles: LeaguePerkStyle[];
  summonerSpells: LeagueSummonerSpell[];
  recommendedRunePages: LeagueRunePage[];
  perks: LeaguePerk[];
  skinCarousel: LeagueSkinCarouselSkin[];
};

type LeagueHonorBallot = {
  gameId?: number;
  players: {
    summonerId: number;
    puuid: string;
    name: string;
    championId: number;
    position: string;
    botPlayer: boolean;
  }[];
};

type LeagueOverview = {
  status: LeagueClientStatus;
  currentSummoner: LeagueSummoner | null;
  friends: LeagueFriend[];
  lobby: LeagueLobby | null;
  gameQueues: LeagueGameQueue[];
  readyCheck: LeagueReadyCheck | null;
  matchmakingSearch: LeagueMatchmakingSearch | null;
  champSelect: LeagueChampSelectOverview | null;
  gameflowPhase: string | null;
  honorBallot: LeagueHonorBallot | null;
};

interface Window {
  bonkClient: {
    getAccount: () => Promise<RiotAccount>;
    getRankedProfile: () => Promise<{
      account: RiotAccount;
      soloQueue: RiotRankedEntry | null;
      source?: "league-client" | "riot-api";
    }>;
    getLeagueClientStatus: () => Promise<LeagueClientStatus>;
    launchLeagueClient: () => Promise<LeagueClientStatus>;
    getLeagueOverview: () => Promise<LeagueOverview>;
    createLeagueLobby: (queueId: number) => Promise<LeagueOverview>;
    startMatchmaking: () => Promise<LeagueOverview>;
    cancelMatchmaking: () => Promise<LeagueOverview>;
    champSelectAction: (
      actionId: number,
      body: { championId?: number; completed?: boolean },
    ) => Promise<LeagueOverview>;
    selectRunePage: (pageId: number) => Promise<LeagueOverview>;
    setRolePreferences: (
      firstPreference: string,
      secondPreference: string,
    ) => Promise<LeagueOverview>;
    inviteToLobby: (
      summonerIds: number | number[],
      queueId?: number,
    ) => Promise<LeagueOverview>;
    setSummonerSpells: (
      spell1Id: number,
      spell2Id: number,
    ) => Promise<LeagueOverview>;
    setSkin: (selectedSkinId: number) => Promise<LeagueOverview>;
    applyRunePage: (page: LeagueRunePage) => Promise<LeagueOverview>;
    saveRunePage: (page: LeagueRunePage) => Promise<LeagueOverview>;
    getRuneData: () => Promise<{
      perkStyles: LeaguePerkStyle[];
      perks: LeaguePerk[];
      recommendedRunePages: LeagueRunePage[];
      summonerSpells: LeagueSummonerSpell[];
    }>;
    clearAssetCache: () => Promise<boolean>;
    getCollection: () => Promise<{
      champions: LeagueCollectionChampion[];
      skins: LeagueCollectionSkin[];
    }>;
    getProfile: () => Promise<LeagueProfileData>;
    getMatchDetail: (gameId: number) => Promise<LeagueMatchDetail | null>;
    getStore: () => Promise<LeagueStoreData>;
    honorPlayer: (summonerId: number) => Promise<LeagueOverview>;
    setProfileIcon: (iconId: number) => Promise<LeagueOverview>;
    acceptReadyCheck: () => Promise<LeagueOverview>;
    declineReadyCheck: () => Promise<LeagueOverview>;
    selectLeagueFolder: () => Promise<LeagueClientStatus>;
    exitApp: () => Promise<void>;
    platform: string;
  };
}
