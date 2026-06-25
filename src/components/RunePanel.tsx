import { motion } from "motion/react";
import { Check, Sparkles, Wand2 } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function SpellSelect({
  value,
  exclude,
  spells,
  onChange,
}: {
  value: number | null;
  exclude: number | null;
  spells: LeagueSummonerSpell[];
  onChange: (id: number) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-10 flex-1 rounded-lg border border-bonk-line bg-black/30 px-2 text-sm text-bonk-text outline-none focus:border-bonk-green/50"
    >
      <option value="" disabled>
        Spell
      </option>
      {spells
        .filter((spell) => spell.id !== exclude)
        .map((spell) => (
          <option key={spell.id} value={spell.id}>
            {spell.name}
          </option>
        ))}
    </select>
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
          <div className="flex gap-2">
            <SpellSelect
              value={spell1Id}
              exclude={spell2Id}
              spells={spells}
              onChange={(id) => onSetSpells(id, spell2Id ?? 0)}
            />
            <SpellSelect
              value={spell2Id}
              exclude={spell1Id}
              spells={spells}
              onChange={(id) => onSetSpells(spell1Id ?? 0, id)}
            />
          </div>
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
          <span className="truncate text-[11px] text-bonk-muted">{currentPageName ?? ""}</span>
        </div>
        <ScrollArea className="max-h-40 bonk-scroll">
          <div className="flex flex-col gap-1.5 pr-2">
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
        </ScrollArea>
      </div>
    </div>
  );
}
