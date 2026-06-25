import { motion } from "motion/react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { championIconSrc } from "@/lib/league-helpers";
import { cn } from "@/lib/utils";
import type { ChampionSummary } from "@/types/league";

export function ChampionGrid({
  champions,
  search,
  onSearchChange,
  activeChampionId,
  availableChampionSet,
  bannedChampionIds,
  isBanPhase,
  onPick,
  loading,
}: {
  champions: ChampionSummary[];
  search: string;
  onSearchChange: (value: string) => void;
  activeChampionId: number | null;
  availableChampionSet: Set<number>;
  bannedChampionIds: Set<number>;
  isBanPhase: boolean;
  onPick: (championId: number) => void;
  loading: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-bonk-line bg-bonk-panel p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-bonk-faint" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search champions"
            className="border-bonk-line bg-white/[0.04] pl-9"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <span className="text-bonk-muted">{champions.length}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-medium",
              isBanPhase
                ? "bg-bonk-danger/15 text-bonk-danger"
                : "bg-bonk-green-dim text-bonk-green-bright",
            )}
          >
            {isBanPhase ? "Ban phase" : "Pick phase"}
          </span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 bonk-scroll">
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 pr-2">
            {Array.from({ length: 24 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square animate-pulse rounded-xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : champions.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
            <strong className="text-sm text-bonk-text">No champions match</strong>
            <small className="text-xs text-bonk-muted">
              Clear the search or wait for champion data to sync.
            </small>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 pr-2">
            {champions.map((champion) => {
              const banned = bannedChampionIds.has(champion.id);
              const unavailable =
                banned ||
                (availableChampionSet.size > 0 &&
                  !availableChampionSet.has(champion.id));
              const selected = activeChampionId === champion.id;

              return (
                <motion.button
                  key={champion.id}
                  whileHover={unavailable ? undefined : { scale: 1.06 }}
                  whileTap={unavailable ? undefined : { scale: 0.95 }}
                  disabled={unavailable}
                  onClick={() => onPick(champion.id)}
                  title={champion.name}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-xl border bg-black/30 transition-colors",
                    selected
                      ? "border-bonk-green shadow-[0_0_22px_-4px_var(--bonk-green)]"
                      : "border-transparent hover:border-white/20",
                    unavailable && "cursor-not-allowed opacity-35 grayscale",
                  )}
                >
                  <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold text-bonk-faint">
                    {champion.name.slice(0, 1)}
                  </span>
                  <img
                    src={championIconSrc(champion.id)}
                    alt={champion.name}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    className="relative size-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-1 pb-0.5 pt-2 text-center text-[10px] font-medium text-bonk-text opacity-0 transition-opacity group-hover:opacity-100">
                    {champion.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </section>
  );
}
