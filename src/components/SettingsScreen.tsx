import { motion } from "motion/react";
import {
  FolderSearch,
  Rocket,
  DownloadCloud,
  RefreshCw,
  FlaskConical,
  ImageOff,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { LeagueClient } from "@/lib/useLeagueClient";

function ActionRow({
  icon: Icon,
  title,
  description,
  actionLabel,
  onClick,
  tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
  tone?: "neutral" | "primary";
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-bonk-line bg-bonk-panel px-5 py-4 backdrop-blur-xl">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-bonk-green-bright">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-sm font-semibold text-bonk-text">{title}</h3>
        <p className="text-xs text-bonk-muted">{description}</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className={cn(
          "shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
          tone === "primary"
            ? "bg-bonk-green text-[#04150b] hover:bg-bonk-green-bright"
            : "border border-bonk-line bg-white/[0.04] text-bonk-text hover:border-bonk-green/40 hover:bg-white/[0.07]",
        )}
      >
        {actionLabel}
      </motion.button>
    </div>
  );
}

export function SettingsScreen({ client }: { client: LeagueClient }) {
  const {
    leagueClientStatus,
    accountStatus,
    actionStatus,
    selectLeagueFolder,
    launchLeagueClient,
    loadRankedProfile,
    checkLeagueClient,
    enterSandbox,
    setActionStatus,
  } = client;

  const connected = Boolean(leagueClientStatus?.connected);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mx-auto flex h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto px-8 py-8 bonk-scroll"
    >
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bonk-green-bright">
          Settings
        </p>
        <h1 className="font-display text-2xl font-bold">League Connection</h1>
      </div>

      {/* Live status */}
      <div className="flex items-center gap-3 rounded-2xl border border-bonk-line bg-white/[0.03] px-5 py-4">
        <span
          className={cn(
            "size-3 rounded-full",
            connected
              ? "bg-bonk-green shadow-[0_0_12px_var(--bonk-green)]"
              : "bg-bonk-faint",
          )}
        />
        <div className="flex-1">
          <strong className="text-sm">
            {connected ? "League connected" : "League offline"}
          </strong>
          <p className="font-mono text-[11px] text-bonk-muted">
            {connected
              ? `${leagueClientStatus?.protocol}:${leagueClientStatus?.port}`
              : leagueClientStatus?.message ?? "Open League or launch it below"}
          </p>
        </div>
      </div>

      <ActionRow
        icon={FolderSearch}
        title="Select League folder"
        description="Point BONK at your League of Legends install if it isn't found automatically."
        actionLabel="Browse"
        onClick={() => void selectLeagueFolder()}
      />
      <ActionRow
        icon={Rocket}
        title="Launch League client"
        description="Start the League client and connect to it automatically."
        actionLabel="Launch"
        tone="primary"
        onClick={() => void launchLeagueClient()}
      />
      <ActionRow
        icon={DownloadCloud}
        title="Pull data"
        description="Reload your account and ranked profile from the client."
        actionLabel="Pull"
        onClick={() => void loadRankedProfile()}
      />
      <ActionRow
        icon={RefreshCw}
        title="Resync client"
        description="Force an immediate refresh of lobby, friends, and live state."
        actionLabel="Resync"
        onClick={() => void checkLeagueClient()}
      />

      <div className="mt-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bonk-violet">
          Developer
        </p>
      </div>
      <ActionRow
        icon={FlaskConical}
        title="Champion select sandbox"
        description="Open a fake champion select to preview and tweak that screen — no match needed."
        actionLabel="Enter"
        tone="primary"
        onClick={enterSandbox}
      />
      <ActionRow
        icon={ImageOff}
        title="Clear icon cache"
        description="Delete cached champion, rune, and spell images. They re-download from League on next use."
        actionLabel="Clear"
        onClick={async () => {
          setActionStatus("Clearing icon cache...");
          const ok = await window.bonkClient.clearAssetCache();
          setActionStatus(ok ? "Icon cache cleared" : "Could not clear icon cache");
        }}
      />

      <div className="mt-1 rounded-xl border border-bonk-line bg-black/20 px-4 py-3 text-xs text-bonk-muted">
        <span className="text-bonk-faint">Account:</span> {accountStatus}
        <span className="mx-2 text-bonk-faint">·</span>
        <span className="text-bonk-faint">Status:</span> {actionStatus}
      </div>
    </motion.section>
  );
}
