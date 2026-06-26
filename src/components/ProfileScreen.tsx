import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Trophy, X, Pencil, ChevronDown, Coins, Swords, Eye } from "lucide-react";

import {
  championIconSrc,
  profileIconSrc,
  perkIconSrc,
  formatQueueName,
} from "@/lib/league-helpers";
import type { LeagueClient } from "@/lib/useLeagueClient";
import { cn } from "@/lib/utils";

function formatPoints(points: number) {
  if (points >= 1_000_000) return `${(points / 1_000_000).toFixed(1)}M`;
  if (points >= 1_000) return `${(points / 1_000).toFixed(1)}K`;
  return String(points);
}

function timeAgo(ms?: number) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function tierColor(tier?: string) {
  const key = (tier || "").toUpperCase();
  if (key.includes("IRON")) return "text-zinc-400";
  if (key.includes("BRONZE")) return "text-amber-700";
  if (key.includes("SILVER")) return "text-slate-300";
  if (key.includes("GOLD")) return "text-yellow-400";
  if (key.includes("PLATINUM")) return "text-teal-300";
  if (key.includes("EMERALD")) return "text-emerald-400";
  if (key.includes("DIAMOND")) return "text-sky-400";
  if (key.includes("MASTER")) return "text-fuchsia-400";
  if (key.includes("GRANDMASTER")) return "text-red-400";
  if (key.includes("CHALLENGER")) return "text-cyan-300";
  return "text-bonk-faint";
}

function formatTierName(tier?: string) {
  if (!tier) return "Unranked";
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

function RankCard({ label, rank }: { label: string; rank: LeagueRankedEntry | null }) {
  const isRanked =
    !!rank &&
    !!rank.tier &&
    !["UNRANKED", "NONE", ""].includes(rank.tier.toUpperCase());
  const games = rank ? rank.wins + rank.losses : 0;
  const winrate = games > 0 ? Math.round((rank!.wins / games) * 100) : 0;
  return (
    <div className="flex-1 rounded-2xl border border-bonk-line bg-bonk-panel p-4">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-bonk-faint">
        {label}
      </p>
      {isRanked ? (
        <>
          <p className={cn("font-display text-lg font-bold", tierColor(rank!.tier))}>
            {formatTierName(rank!.tier)} {rank!.division}
          </p>
          <p className="text-sm text-bonk-text">{rank!.leaguePoints} LP</p>
          <p className="mt-1 text-[11px] text-bonk-muted">
            {rank!.wins}W {rank!.losses}L · {winrate}% WR
          </p>
        </>
      ) : (
        <p className="font-display text-lg font-bold text-bonk-faint">Unranked</p>
      )}
    </div>
  );
}

function multiKillLabel(value: number) {
  return ["", "", "Double Kill", "Triple Kill", "Quadra Kill", "Penta Kill"][value] ?? "";
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-1.5">
      <Icon className="size-3.5 text-bonk-faint" />
      <div className="leading-tight">
        <p className="text-[9px] uppercase tracking-wide text-bonk-faint">{label}</p>
        <p className="text-xs font-semibold tabular-nums text-bonk-text">{value}</p>
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: LeagueMatchPlayer }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1",
        player.isLocal && "bg-bonk-green/10",
      )}
    >
      <img
        src={championIconSrc(player.championId)}
        alt=""
        onError={(event) => {
          event.currentTarget.style.opacity = "0";
        }}
        className="size-7 shrink-0 rounded object-cover"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[11px] font-medium",
            player.isLocal ? "text-bonk-green-bright" : "text-bonk-text",
          )}
        >
          {player.name}
        </p>
        <p className="text-[10px] tabular-nums text-bonk-muted">
          {player.kills}/{player.deaths}/{player.assists} · {player.cs} CS
        </p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        {player.items.slice(0, 6).map((item, index) => (
          <span
            key={`${item.id}-${index}`}
            className="size-5 overflow-hidden rounded-sm border border-bonk-line/60 bg-black/30"
          >
            {item.iconPath && (
              <img
                src={perkIconSrc(item.iconPath)}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
                className="size-full object-cover"
              />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamBlock({
  title,
  win,
  players,
}: {
  title: string;
  win: boolean;
  players: LeagueMatchPlayer[];
}) {
  return (
    <div className="flex-1 rounded-lg border border-bonk-line bg-black/20 p-2">
      <p
        className={cn(
          "mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider",
          win ? "text-bonk-green-bright" : "text-bonk-danger",
        )}
      >
        {title} · {win ? "Victory" : "Defeat"}
      </p>
      <div className="flex flex-col gap-0.5">
        {players.map((player, index) => (
          <PlayerRow key={index} player={player} />
        ))}
      </div>
    </div>
  );
}

function MatchRow({
  match,
  detail,
  onExpand,
}: {
  match: LeagueMatchSummary;
  detail: LeagueMatchDetail | "loading" | "error" | undefined;
  onExpand: (gameId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const kda =
    match.deaths === 0
      ? "Perfect"
      : ((match.kills + match.assists) / match.deaths).toFixed(2);
  const minutes = match.gameDuration ? match.gameDuration / 60 : 0;
  const csPerMin = minutes > 0 ? (match.cs / minutes).toFixed(1) : "0";

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !detail) onExpand(match.gameId);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        match.win
          ? "border-bonk-green/30 bg-bonk-green/[0.06]"
          : "border-bonk-danger/30 bg-bonk-danger/[0.06]",
      )}
    >
      <button onClick={toggle} className="flex w-full items-center gap-3 px-3 py-2 text-left">
        <img
          src={championIconSrc(match.championId)}
          alt=""
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
          className="size-10 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold",
              match.win ? "text-bonk-green-bright" : "text-bonk-danger",
            )}
          >
            {match.win ? "Victory" : "Defeat"}
          </p>
          <p className="text-[11px] text-bonk-muted">
            {formatQueueName(match.queueId)} · {timeAgo(match.gameCreation)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm tabular-nums text-bonk-text">
            {match.kills}/{match.deaths}/{match.assists}
          </p>
          <p className="text-[11px] text-bonk-muted">
            {kda} KDA · {match.cs} CS
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-bonk-faint transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 px-3 py-3">
              <div className="flex flex-wrap gap-2">
                <StatChip icon={Coins} label="Gold" value={(match.gold / 1000).toFixed(1) + "k"} />
                <StatChip
                  icon={Swords}
                  label="Damage"
                  value={(match.damage / 1000).toFixed(1) + "k"}
                />
                <StatChip icon={Eye} label="Vision" value={String(match.visionScore)} />
                <StatChip icon={Trophy} label="Level" value={String(match.champLevel)} />
                <StatChip icon={Coins} label="CS/min" value={csPerMin} />
                <StatChip icon={Eye} label="Wards" value={String(match.wardsPlaced)} />
              </div>

              {match.largestMultiKill >= 2 && (
                <p className="mt-2 text-[11px] font-semibold text-bonk-gold">
                  {multiKillLabel(match.largestMultiKill)}
                </p>
              )}

              {/* Full scoreboard */}
              <div className="mt-3">
                {detail === "loading" || detail === undefined ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-bonk-muted">
                    <Loader2 className="size-4 animate-spin" />
                    Loading scoreboard…
                  </div>
                ) : detail === "error" ? (
                  <p className="py-3 text-center text-xs text-bonk-faint">
                    Scoreboard unavailable for this match.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <TeamBlock
                      title="Your team"
                      win={detail.allyTeam.win}
                      players={detail.allyTeam.players}
                    />
                    <TeamBlock
                      title="Enemy team"
                      win={detail.enemyTeam.win}
                      players={detail.enemyTeam.players}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProfileScreen({ client }: { client: LeagueClient }) {
  const { profile, profileLoading, loadProfile, setProfileIcon, currentSummoner, matchDetails, loadMatchDetail } =
    client;
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    if (!profile && !profileLoading) void loadProfile();
  }, [profile, profileLoading, loadProfile]);

  const summoner = profile?.summoner ?? currentSummoner ?? null;
  const iconId = summoner?.profileIconId;
  const displayName =
    summoner?.gameName ?? summoner?.displayName ?? "Summoner";
  const tagLine = summoner?.tagLine;

  const ownedIconIds = useMemo(
    () => (profile?.ownedIconIds ?? []).filter((id) => id > 0).slice(0, 120),
    [profile],
  );

  if (profileLoading && !profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-bonk-muted">
        <Loader2 className="size-6 animate-spin text-bonk-green-bright" />
        <p className="text-sm">Loading your profile…</p>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mx-auto flex h-full w-full max-w-4xl flex-col gap-5 overflow-y-auto bonk-scroll p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-bonk-line bg-bonk-panel p-5">
        <button
          onClick={() => setIconPickerOpen(true)}
          className="group relative size-20 shrink-0 overflow-hidden rounded-2xl border border-bonk-line"
        >
          {iconId != null && (
            <img
              src={profileIconSrc(iconId)}
              alt="Profile icon"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              className="size-full object-cover"
            />
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/50 group-hover:opacity-100">
            <Pencil className="size-5 text-white" />
          </span>
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">
            {displayName}
            {tagLine && <span className="text-bonk-faint"> #{tagLine}</span>}
          </h1>
          <p className="text-sm text-bonk-muted">Level {summoner?.summonerLevel ?? "—"}</p>
        </div>
      </div>

      {/* Ranked */}
      <div className="flex gap-3">
        <RankCard label="Ranked Solo/Duo" rank={profile?.rankedSolo ?? null} />
        <RankCard label="Ranked Flex" rank={profile?.rankedFlex ?? null} />
      </div>

      {/* Mastery */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Trophy className="size-3.5 text-bonk-gold" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-bonk-faint">
            Champion mastery
          </p>
        </div>
        {(profile?.mastery.length ?? 0) === 0 ? (
          <p className="text-xs text-bonk-faint">No mastery data.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-3">
            {profile!.mastery.map((entry) => (
              <div key={entry.championId} className="flex flex-col items-center gap-1">
                <div className="relative size-16 overflow-hidden rounded-xl border border-bonk-line">
                  <img
                    src={championIconSrc(entry.championId)}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.style.opacity = "0";
                    }}
                    className="size-full object-cover"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-center text-[9px] font-semibold text-bonk-green-bright">
                    M{entry.level}
                  </span>
                </div>
                <span className="text-[10px] text-bonk-muted">{formatPoints(entry.points)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match history */}
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-bonk-faint">
          Recent matches
        </p>
        {(profile?.matches.length ?? 0) === 0 ? (
          <p className="text-xs text-bonk-faint">No recent matches.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {profile!.matches.map((match) => (
              <MatchRow
                key={match.gameId}
                match={match}
                detail={matchDetails[match.gameId]}
                onExpand={loadMatchDetail}
              />
            ))}
          </div>
        )}
      </div>

      {/* Icon picker */}
      <AnimatePresence>
        {iconPickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIconPickerOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[80vh] w-[560px] flex-col overflow-hidden rounded-3xl border border-bonk-line bg-bonk-panel-strong backdrop-blur-2xl"
            >
              <header className="flex items-center justify-between border-b border-bonk-line px-6 py-4">
                <h2 className="font-display text-lg font-bold">Choose profile icon</h2>
                <button
                  onClick={() => setIconPickerOpen(false)}
                  className="flex size-9 items-center justify-center rounded-lg text-bonk-muted hover:bg-white/5 hover:text-bonk-text"
                >
                  <X className="size-4" />
                </button>
              </header>
              <div className="grid grid-cols-6 gap-2 overflow-y-auto bonk-scroll p-6 sm:grid-cols-8">
                {ownedIconIds.length === 0 ? (
                  <p className="col-span-full text-center text-xs text-bonk-faint">
                    No owned icons found.
                  </p>
                ) : (
                  ownedIconIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        void setProfileIcon(id);
                        setIconPickerOpen(false);
                      }}
                      className={cn(
                        "overflow-hidden rounded-lg border transition-colors",
                        id === iconId
                          ? "border-bonk-green"
                          : "border-bonk-line hover:border-bonk-green/40",
                      )}
                    >
                      <img
                        src={profileIconSrc(id)}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                        className="size-full object-cover"
                      />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
