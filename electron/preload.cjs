const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bonkClient", {
  getAccount: () => ipcRenderer.invoke("riot:get-account"),
  getRankedProfile: () => ipcRenderer.invoke("riot:get-ranked-profile"),
  getLeagueClientStatus: () => ipcRenderer.invoke("league:get-client-status"),
  launchLeagueClient: () => ipcRenderer.invoke("league:launch-client"),
  getLeagueOverview: () => ipcRenderer.invoke("league:get-overview"),
  createLeagueLobby: (queueId) => ipcRenderer.invoke("league:create-lobby", queueId),
  startMatchmaking: () => ipcRenderer.invoke("league:start-matchmaking"),
  cancelMatchmaking: () => ipcRenderer.invoke("league:cancel-matchmaking"),
  champSelectAction: (actionId, body) =>
    ipcRenderer.invoke("league:champ-select-action", actionId, body),
  selectRunePage: (pageId) => ipcRenderer.invoke("league:select-rune-page", pageId),
  setRolePreferences: (firstPreference, secondPreference) =>
    ipcRenderer.invoke("league:set-role-preferences", firstPreference, secondPreference),
  inviteToLobby: (summonerIds, queueId) =>
    ipcRenderer.invoke("league:invite-to-lobby", summonerIds, queueId),
  setSkin: (selectedSkinId) => ipcRenderer.invoke("league:set-skin", selectedSkinId),
  setSummonerSpells: (spell1Id, spell2Id) =>
    ipcRenderer.invoke("league:set-summoner-spells", spell1Id, spell2Id),
  applyRunePage: (page) => ipcRenderer.invoke("league:apply-rune-page", page),
  saveRunePage: (page) => ipcRenderer.invoke("league:save-rune-page", page),
  getRuneData: () => ipcRenderer.invoke("league:get-rune-data"),
  clearAssetCache: () => ipcRenderer.invoke("league:clear-asset-cache"),
  getCollection: () => ipcRenderer.invoke("league:get-collection"),
  getProfile: () => ipcRenderer.invoke("league:get-profile"),
  getMatchDetail: (gameId) => ipcRenderer.invoke("league:get-match-detail", gameId),
  getStore: () => ipcRenderer.invoke("league:get-store"),
  honorPlayer: (summonerId) => ipcRenderer.invoke("league:honor-player", summonerId),
  setProfileIcon: (iconId) => ipcRenderer.invoke("league:set-profile-icon", iconId),
  acceptReadyCheck: () => ipcRenderer.invoke("league:accept-ready-check"),
  declineReadyCheck: () => ipcRenderer.invoke("league:decline-ready-check"),
  selectLeagueFolder: () => ipcRenderer.invoke("league:select-install-folder"),
  exitApp: () => ipcRenderer.invoke("app:exit"),
  platform: process.platform,
});
