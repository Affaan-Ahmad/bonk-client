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
  setSummonerSpells: (spell1Id, spell2Id) =>
    ipcRenderer.invoke("league:set-summoner-spells", spell1Id, spell2Id),
  applyRunePage: (page) => ipcRenderer.invoke("league:apply-rune-page", page),
  acceptReadyCheck: () => ipcRenderer.invoke("league:accept-ready-check"),
  declineReadyCheck: () => ipcRenderer.invoke("league:decline-ready-check"),
  selectLeagueFolder: () => ipcRenderer.invoke("league:select-install-folder"),
  exitApp: () => ipcRenderer.invoke("app:exit"),
  platform: process.platform,
});
