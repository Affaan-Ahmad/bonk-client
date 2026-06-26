import { useState } from "react";
import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Ban } from "lucide-react";

import { ChampionGrid } from "@/components/ChampionGrid";
import { RunePanel } from "@/components/RunePanel";
import { SkinPicker } from "@/components/SkinPicker";
import { RuneEditor } from "@/components/RuneEditor";
import { championIconSrc, formatPosition, phaseLabel, formatPhaseTimer, resolveChampSelectBans } from "@/lib/league-helpers";
import { cn } from "@/lib/utils";
import type { LeagueClient } from "@/lib/useLeagueClient";
import type { ChampionSummary } from "@/types/league";

function TeamRow({
  player,
  champion,
  isLocal,
  hidden,
}: {
  player: LeagueChampSelectPlayer;
  champion: ChampionSummary | null;
  isLocal: boolean;
  hidden?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors",
        isLocal
          ? "border-bonk-green/50 bg-bonk-green-dim"
          : "border-bonk-line bg-white/[0.02]",
      )}
    >
      <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/40 text-xs font-semibold text-bonk-faint">
        <span className="absolute inset-0 grid place-items-center">
          {champion?.name?.slice(0, 1) ?? (hidden ? "" : "?")}
        </span>
        {champion && (
          <img
            src={championIconSrc(champion.id)}
            alt={champion.name}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="relative size-full object-cover"
          />
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-bonk-text">
          {hidden ? "Hidden" : champion?.name ?? "Selecting…"}
        </p>
        <p className="text-[10px] text-bonk-muted">{formatPosition(player.assignedPosition)}</p>
      </div>
    </div>
  );
}

function BanStrip({
  label,
  bans,
  championById,
}: {
  label: string;
  bans: number[];
  championById: Map<number, ChampionSummary>;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-bonk-faint">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {bans.filter(Boolean).length === 0 ? (
          <span className="text-[11px] text-bonk-faint">No bans yet</span>
        ) : (
          bans.filter(Boolean).map((championId, index) => (
            <span
              key={`${championId}-${index}`}
              className="size-7 overflow-hidden rounded-md border border-bonk-danger/30 grayscale"
              title={championById.get(championId)?.name ?? "Banned"}
            >
              <img
                src={championIconSrc(championId)}
                alt={championById.get(championId)?.name ?? "Banned champion"}
                className="size-full object-cover"
              />
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function ChampionSelectScreen({ client }: { client: LeagueClient }) {
  const [search, setSearch] = useState("");
  const [runeEditorOpen, setRuneEditorOpen] = useState(false);
  const {
    champSelect,
    champSelectSession,
    localPlayerCellId,
    localAction,
    localActionType,
    localActions,
    canLock,
    activeChampionId,
    selectedChampion,
    championById,
    takenChampionIds,
    bannedChampionIds,
    phaseTimeLeft,
    phaseProgress,
    localSpell1Id,
    localSpell2Id,
    summonerSpells,
    recommendedRunePages,
    skinCarousel,
    localSelectedSkinId,
    actionStatus,
    hoverChampion,
    lockInChampion,
    selectRunePage,
    setSummonerSpells,
    setSkin,
    applyRunePage,
    saveRunePage,
    sandbox,
    exitSandbox,
  } = client;

  const isBanPhase = localActionType === "ban";
  const bans = resolveChampSelectBans(champSelectSession);

  const visibleChampions = useMemo<ChampionSummary[]>(() => {
    const query = search.trim().toLowerCase();
    return (champSelect?.champions ?? [])
      .filter((champion): champion is ChampionSummary => champion.id > 0)
      .filter((champion) => !query || champion.name.toLowerCase().includes(query))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [champSelect, search]);

  const canAct = Boolean(canLock && activeChampionId);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative z-10 flex h-full min-h-0 flex-col gap-4 p-6"
    >
      {sandbox && (
        <div className="absolute right-6 top-6 z-20 flex items-center gap-2 rounded-full border border-bonk-violet/40 bg-bonk-violet/15 px-3 py-1.5 text-xs font-medium text-bonk-violet">
          Sandbox preview
          <button
            onClick={exitSandbox}
            className="rounded-full bg-bonk-violet/25 px-2 py-0.5 text-bonk-violet transition-colors hover:bg-bonk-violet/40"
          >
            Exit
          </button>
        </div>
      )}
      {/* Header: phase + timer */}
      <header className="flex items-center justify-between rounded-2xl border border-bonk-line bg-bonk-panel px-6 py-4 backdrop-blur-xl">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bonk-green-bright">
            Champion Select
          </p>
          <h2 className="font-display text-2xl font-bold">
            {phaseLabel(champSelectSession?.timer?.phase)}
          </h2>
          <p className="text-xs text-bonk-muted">
            {canLock
              ? `Your turn — ${localActionType === "ban" ? "ban a champion" : "lock in"}`
              : localAction
                ? "Declare your intended pick"
                : "Waiting for your turn"}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <span className="font-mono text-4xl font-bold text-bonk-green-bright tabular-nums">
            {formatPhaseTimer(phaseTimeLeft)}
          </span>
          <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-white/10">
            <motion.span
              className="block h-full rounded-full bg-bonk-green"
              animate={{ width: `${phaseProgress}%` }}
              transition={{ ease: "linear", duration: 0.9 }}
            />
          </div>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-bonk-faint">Selected</p>
          <strong className="font-display text-lg">{selectedChampion?.name ?? "None"}</strong>
          <p className="text-xs text-bonk-muted">{actionStatus}</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr_300px] gap-4">
        {/* Teams + bans */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-bonk-line bg-bonk-panel p-4 backdrop-blur-xl bonk-scroll">
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-bonk-green-bright">
              Your Team
            </p>
            <div className="flex flex-col gap-1.5">
              {(champSelectSession?.myTeam ?? []).map((player) => (
                <TeamRow
                  key={player.cellId}
                  player={player}
                  champion={player.championId ? championById.get(player.championId) ?? null : null}
                  isLocal={player.cellId === localPlayerCellId}
                />
              ))}
            </div>
          </div>

          <BanStrip
            label="Team bans"
            bans={bans.myTeamBans}
            championById={championById}
          />

          <div className="mt-1">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-bonk-danger">
              Enemy Team
            </p>
            <div className="flex flex-col gap-1.5">
              {(champSelectSession?.theirTeam ?? []).map((player) => (
                <TeamRow
                  key={player.cellId}
                  player={player}
                  champion={player.championId ? championById.get(player.championId) ?? null : null}
                  isLocal={false}
                  hidden={!player.championId}
                />
              ))}
            </div>
          </div>

          <BanStrip
            label="Enemy bans"
            bans={bans.theirTeamBans}
            championById={championById}
          />
        </aside>

        {/* Grid — click hovers immediately */}
        <ChampionGrid
          champions={visibleChampions}
          search={search}
          onSearchChange={setSearch}
          activeChampionId={activeChampionId}
          takenChampionIds={takenChampionIds}
          bannedChampionIds={bannedChampionIds}
          isBanPhase={isBanPhase}
          onPick={(championId) => void hoverChampion(championId)}
          loading={(champSelect?.champions ?? []).length === 0}
        />

        {/* Preview + lock + runes */}
        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto bonk-scroll">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-bonk-line bg-bonk-panel p-5 backdrop-blur-xl">
            <p className="text-[11px] font-medium uppercase tracking-wider text-bonk-faint">
              {isBanPhase ? "Ban target" : "Pick target"}
            </p>
            <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-2xl border border-bonk-line bg-black/40 font-display text-4xl font-bold text-bonk-faint">
              <span className="absolute inset-0 grid place-items-center">
                {selectedChampion ? selectedChampion.name.slice(0, 1) : "?"}
              </span>
              {selectedChampion && (
                <img
                  src={championIconSrc(selectedChampion.id)}
                  alt={selectedChampion.name}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  className="relative size-full object-cover"
                />
              )}
            </div>
            <h3 className="font-display text-lg font-semibold">
              {selectedChampion?.name ?? "Choose a champion"}
            </h3>

            <motion.button
              whileHover={canAct ? { scale: 1.02 } : undefined}
              whileTap={canAct ? { scale: 0.98 } : undefined}
              disabled={!canAct}
              onClick={() => void lockInChampion()}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40",
                isBanPhase
                  ? "bg-bonk-danger text-white shadow-[0_0_28px_-10px_var(--bonk-danger)] hover:opacity-90"
                  : "bg-bonk-green text-[#04150b] shadow-[0_0_28px_-8px_var(--bonk-green)] hover:bg-bonk-green-bright",
              )}
            >
              {isBanPhase ? <Ban className="size-5" /> : <Lock className="size-5" />}
              {isBanPhase ? "Ban" : "Lock In"}
            </motion.button>

            <p className="text-center text-[11px] text-bonk-faint">
              {localAction
                ? `Action ${localAction.id} · ${localActionType.toUpperCase()} · Cell ${localPlayerCellId}`
                : `No action · Cell ${localPlayerCellId ?? "?"} · ${localActions.length} local`}
            </p>
          </div>

          <SkinPicker
            skins={skinCarousel}
            selectedSkinId={localSelectedSkinId}
            onSelectSkin={(skinId) => void setSkin(skinId)}
          />

          <RunePanel
            runePages={champSelect?.runePages ?? []}
            perkStyles={champSelect?.perkStyles ?? []}
            recommendedRunePages={recommendedRunePages}
            currentPageName={champSelect?.currentRunePage?.name}
            summonerSpells={summonerSpells}
            spell1Id={localSpell1Id}
            spell2Id={localSpell2Id}
            onSelectPage={(pageId) => void selectRunePage(pageId)}
            onApplyRecommended={(page) => void applyRunePage(page)}
            onSetSpells={(spell1, spell2) => void setSummonerSpells(spell1, spell2)}
            onEditRunes={() => setRuneEditorOpen(true)}
          />
        </aside>
      </div>

      <AnimatePresence>
        {runeEditorOpen && (
          <RuneEditor
            perkStyles={champSelect?.perkStyles ?? []}
            perks={champSelect?.perks ?? []}
            currentPage={champSelect?.currentRunePage ?? null}
            recommendedRunePages={recommendedRunePages}
            onSave={(page) => void saveRunePage(page)}
            onClose={() => setRuneEditorOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
