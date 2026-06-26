import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Sparkles, Wand2 } from "lucide-react";

import { perkIconSrc } from "@/lib/league-helpers";
import { cn } from "@/lib/utils";

function SpellIcon({ spell, className }: { spell?: LeagueSummonerSpell; className?: string }) {
  return (
    <span
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-md bg-black/40",
        className,
      )}
    >
      <span className="absolute text-[8px] font-semibold text-bonk-faint">
        {spell?.name?.slice(0, 2) ?? "?"}
      </span>
      {spell?.iconPath && (
        <img
          src={perkIconSrc(spell.iconPath)}
          alt={spell.name}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="relative size-full object-cover"
        />
      )}
    </span>
  );
}

function SpellPicker({
  spells,
  spell1Id,
  spell2Id,
  onSetSpells,
}: {
  spells: LeagueSummonerSpell[];
  spell1Id: number | null;
  spell2Id: number | null;
  onSetSpells: (spell1Id: number, spell2Id: number) => void;
}) {
  const [activeSlot, setActiveSlot] = useState<0 | 1 | null>(null);
  const byId = (id: number | null) => spells.find((spell) => spell.id === id);

  const choose = (spellId: number) => {
    if (activeSlot === 0) {
      // Avoid duplicate spells: if the new spell equals slot 2, swap.
      onSetSpells(spellId, spellId === spell2Id ? spell1Id ?? 0 : spell2Id ?? 0);
    } else if (activeSlot === 1) {
      onSetSpells(spellId === spell1Id ? spell2Id ?? 0 : spell1Id ?? 0, spellId);
    }
    setActiveSlot(null);
  };

  return (
    <div>
      <div className="flex gap-2">
        {[0, 1].map((slot) => {
          const current = byId(slot === 0 ? spell1Id : spell2Id);
          const open = activeSlot === slot;
          return (
            <button
              key={slot}
              onClick={() => setActiveSlot(open ? null : (slot as 0 | 1))}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors",
                open
                  ? "border-bonk-green/60 bg-bonk-green-dim"
                  : "border-bonk-line bg-black/30 hover:border-white/20",
              )}
            >
              <SpellIcon spell={current} className="size-7" />
              <span className="truncate text-sm text-bonk-text">{current?.name ?? "Spell"}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {activeSlot !== null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 grid grid-cols-5 gap-2 rounded-lg border border-bonk-line bg-black/20 p-2">
              {spells.map((spell) => (
                <button
                  key={spell.id}
                  title={spell.name}
                  onClick={() => choose(spell.id)}
                  className={cn(
                    "grid place-items-center rounded-md border p-0.5 transition-colors",
                    (activeSlot === 0 ? spell1Id : spell2Id) === spell.id
                      ? "border-bonk-green"
                      : "border-transparent hover:border-white/20",
                  )}
                >
                  <SpellIcon spell={spell} className="size-9" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RunePanel({
  runePages,
  perkStyles,
  recommendedRunePages,
  currentPageName,
  summonerSpells,
  spell1Id,
  spell2Id,
  onSelectPage,
  onApplyRecommended,
  onSetSpells,
  onEditRunes,
}: {
  runePages: LeagueRunePage[];
  perkStyles: LeaguePerkStyle[];
  recommendedRunePages: LeagueRunePage[];
  currentPageName?: string;
  summonerSpells: LeagueSummonerSpell[];
  spell1Id: number | null;
  spell2Id: number | null;
  onSelectPage: (pageId: number) => void;
  onApplyRecommended: (page: LeagueRunePage) => void;
  onSetSpells: (spell1Id: number, spell2Id: number) => void;
  onEditRunes: () => void;
}) {
  const styleName = (id?: number, fallback = "—") =>
    perkStyles.find((style) => style.id === id)?.name ?? fallback;

  const playableSpells = summonerSpells.filter(
    (spell) =>
      !spell.gameModes || spell.gameModes.length === 0 || spell.gameModes.includes("CLASSIC"),
  );
  const spells = playableSpells.length > 0 ? playableSpells : summonerSpells;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-bonk-line bg-bonk-panel p-4 backdrop-blur-xl">
      {/* Summoner spells */}
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-bonk-faint">
          Summoner spells
        </p>
        {spells.length === 0 ? (
          <p className="text-[11px] text-bonk-faint">Spell data loads with champ select.</p>
        ) : (
          <SpellPicker
            spells={spells}
            spell1Id={spell1Id}
            spell2Id={spell2Id}
            onSetSpells={onSetSpells}
          />
        )}
      </div>

      {/* Recommended runes */}
      {recommendedRunePages.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Wand2 className="size-3.5 text-bonk-violet" />
            <p className="text-[11px] font-medium uppercase tracking-wider text-bonk-violet">
              Recommended
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {recommendedRunePages.map((page, index) => (
              <motion.button
                key={`${page.id}-${index}`}
                whileTap={{ scale: 0.98 }}
                onClick={() => onApplyRecommended(page)}
                className="flex items-center justify-between rounded-lg border border-bonk-violet/30 bg-bonk-violet/10 px-3 py-2 text-left transition-colors hover:bg-bonk-violet/20"
              >
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-bonk-text">{page.name}</strong>
                  <small className="text-[11px] text-bonk-muted">
                    {styleName(page.primaryStyleId, "Primary")} ·{" "}
                    {styleName(page.subStyleId, "Secondary")}
                  </small>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-bonk-violet">Apply</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Saved rune pages */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-bonk-green-bright" />
            <p className="text-[11px] font-medium uppercase tracking-wider text-bonk-faint">
              Rune pages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="max-w-24 truncate text-[11px] text-bonk-muted">
              {currentPageName ?? ""}
            </span>
            <button
              onClick={onEditRunes}
              className="rounded-md border border-bonk-line bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-bonk-text transition-colors hover:border-bonk-green/40 hover:text-bonk-green-bright"
            >
              Edit
            </button>
          </div>
        </div>
        <div className="max-h-44 overflow-y-auto bonk-scroll">
          <div className="flex flex-col gap-1.5 pr-1">
            {runePages.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-6 text-center">
                <strong className="text-sm text-bonk-text">No rune pages</strong>
                <small className="text-xs text-bonk-muted">
                  Open champ select in League to sync rune pages.
                </small>
              </div>
            ) : (
              runePages.map((page) => (
                <motion.button
                  key={page.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectPage(page.id)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                    page.current
                      ? "border-bonk-green/60 bg-bonk-green-dim"
                      : "border-bonk-line bg-white/[0.03] hover:bg-white/[0.06]",
                  )}
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-bonk-text">{page.name}</strong>
                    <small className="text-[11px] text-bonk-muted">
                      {styleName(page.primaryStyleId, "Primary")} ·{" "}
                      {styleName(page.subStyleId, "Secondary")}
                    </small>
                  </div>
                  {page.current && <Check className="size-4 shrink-0 text-bonk-green-bright" />}
                </motion.button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
