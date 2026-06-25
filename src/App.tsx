import { type CSSProperties, useState } from "react";

import "@/globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PlayScreen } from "@/components/PlayScreen";
import { ChampionSelectScreen } from "@/components/ChampionSelectScreen";
import { SettingsScreen } from "@/components/SettingsScreen";
import { FriendsDrawer } from "@/components/FriendsDrawer";
import { ReadyCheckModal } from "@/components/ReadyCheckModal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLeagueClient } from "@/lib/useLeagueClient";
import { SCENE_SPLASH_URL } from "@/lib/constants";
import type { NavItem } from "@/types/league";

// Runtime-only injection of the protocol URL. The literal never lives in CSS,
// so Vite's build never tries to resolve the custom bonk-lcu:// scheme.
const sceneStyle = {
  "--scene-splash": `url("${SCENE_SPLASH_URL}")`,
} as CSSProperties;

function Scene() {
  return (
    <div className="bonk-scene" style={sceneStyle} aria-hidden="true">
      <div className="bonk-scene__splash" />
      <span className="bonk-scene__glow bonk-scene__glow--a" />
      <span className="bonk-scene__glow bonk-scene__glow--b" />
      <div className="bonk-grid-overlay" />
      <div className="bonk-scene__vignette" />
    </div>
  );
}

function TopBar({
  active,
  client,
}: {
  active: NavItem;
  client: ReturnType<typeof useLeagueClient>;
}) {
  const { account, leagueClientStatus, playerRank, playerLp, playerWinRate, soloQueue } =
    client;

  return (
    <header className="drag-region relative z-10 flex items-center justify-between border-b border-bonk-line px-8 py-4">
      <div className="no-drag">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bonk-green-bright">
          BONK Client
        </p>
        <h1 className="font-display text-2xl font-bold">
          {active === "Home" ? "Command Center" : active}
        </h1>
      </div>

      <div className="no-drag flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <span
            className={
              leagueClientStatus?.connected
                ? "size-2.5 rounded-full bg-bonk-green shadow-[0_0_10px_var(--bonk-green)]"
                : "size-2.5 rounded-full bg-bonk-faint"
            }
          />
          <div className="leading-tight">
            <strong className="block text-sm">
              {leagueClientStatus?.connected ? "League connected" : "League offline"}
            </strong>
            <small className="text-[11px] text-bonk-muted">
              {leagueClientStatus?.connected
                ? `${leagueClientStatus.protocol}:${leagueClientStatus.port}`
                : "Open League to sync live data"}
            </small>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-bonk-line bg-white/[0.03] px-3 py-1.5">
          <div className="text-right leading-tight">
            <strong className="block text-sm">
              {account
                ? `${account.gameName}${account.tagLine ? ` #${account.tagLine}` : ""}`
                : "Player"}
            </strong>
            <small className="font-mono text-[11px] text-bonk-muted">
              {playerRank}
              {soloQueue ? ` · ${playerLp} · ${playerWinRate}% WR` : ""}
            </small>
          </div>
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-bonk-green to-[#0f7a39] font-display font-bold text-[#04150b]">
            {(account?.gameName ?? "P").slice(0, 1).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}

function App() {
  const client = useLeagueClient();
  const [activeNav, setActiveNav] = useState<NavItem>("Home");
  const [friendsOpen, setFriendsOpen] = useState(false);

  return (
    <TooltipProvider>
      <Scene />
      <main className="relative flex h-screen w-screen overflow-hidden">
        <Sidebar
          active={activeNav}
          onSelect={setActiveNav}
          onExit={() => void client.exitApp()}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar active={activeNav} client={client} />

          <div className="min-h-0 flex-1">
            {client.isChampSelectActive ? (
              <ChampionSelectScreen client={client} />
            ) : activeNav === "Settings" ? (
              <SettingsScreen client={client} />
            ) : (
              <PlayScreen
                client={client}
                onOpenFriends={() => setFriendsOpen(true)}
                onInviteFriend={(summonerId, name) => void client.inviteFriend(summonerId, name)}
              />
            )}
          </div>
        </div>

        <FriendsDrawer
          open={friendsOpen}
          onOpenChange={setFriendsOpen}
          getFriends={client.getFriends}
          onInvite={(friend) => void client.inviteFriend(friend.summonerId, friend.name)}
        />

        <ReadyCheckModal
          active={client.isReadyCheckActive}
          canRespond={client.canRespondToReadyCheck}
          seconds={client.readyCheckSeconds}
          progress={client.readyCheckProgress}
          autoAccept={client.autoAccept}
          onAutoAcceptChange={client.setAutoAccept}
          onAccept={() => void client.acceptReadyCheck()}
          onDecline={() => void client.declineReadyCheck()}
          responseLabel={client.readyCheck?.playerResponse}
        />
      </main>
    </TooltipProvider>
  );
}

export default App;
