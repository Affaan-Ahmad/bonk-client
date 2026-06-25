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

type LeaguePerkStyle = {
  id: number;
  name: string;
  tooltip?: string;
};

type LeagueChampSelectOverview = {
  session: LeagueChampSelectSession;
  pickableChampionIds: number[];
  bannableChampionIds: number[];
  champions: LeagueChampionSummary[];
  runePages: LeagueRunePage[];
  currentRunePage: LeagueRunePage | null;
  perkStyles: LeaguePerkStyle[];
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
    acceptReadyCheck: () => Promise<LeagueOverview>;
    declineReadyCheck: () => Promise<LeagueOverview>;
    selectLeagueFolder: () => Promise<LeagueClientStatus>;
    exitApp: () => Promise<void>;
    platform: string;
  };
}
