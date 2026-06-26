import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Lock, Check, X, Loader2, Layers } from "lucide-react";

import { championIconSrc, perkIconSrc } from "@/lib/league-helpers";
import type { LeagueClient } from "@/lib/useLeagueClient";
import { cn } from "@/lib/utils";

type OwnershipFilter = "all" | "owned" | "unowned";

export function CollectionScreen({ client }: { client: LeagueClient }) {
  const { collection, collectionLoading, loadCollection } = client;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OwnershipFilter>("all");
  const [selectedChampionId, setSelectedChampionId] = useState<number | null>(null);

  useEffect(() => {
    if (!collection && !collectionLoading) void loadCollection();
  }, [collection, collectionLoading, loadCollection]);

  const champions = collection?.champions ?? [];
  const skins = collection?.skins ?? [];

  const ownedCount = champions.filter((champ) => champ.owned).length;
  const ownedSkinCount = skins.filter((skin) => skin.owned && !skin.isBase).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return champions
      .filter((champ) => {
        if (filter === "owned" && !champ.owned) return false;
        if (filter === "unowned" && champ.owned) return false;
        if (query && !champ.name?.toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [champions, search, filter]);

  const selectedChampion = champions.find((champ) => champ.id === selectedChampionId) ?? null;
  const championSkins = useMemo(
    () =>
      skins
        .filter((skin) => skin.championId === selectedChampionId)
        .sort((a, b) => (a.isBase ? -1 : b.isBase ? 1 : a.id - b.id)),
    [skins, selectedChampionId],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 flex h-full flex-col gap-4 p-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bonk-green-bright">
            Collection
          </p>
          <h1 className="font-display text-2xl font-bold">Champions & Skins</h1>
          <p className="mt-1 text-xs text-bonk-muted">
            {champions.length > 0
              ? `${ownedCount}/${champions.length} champions · ${ownedSkinCount} skins owned`
              : "Loading your collection…"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-bonk-line bg-black/30 px-3">
            <Search className="size-4 text-bonk-faint" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search champions"
              className="h-9 w-44 bg-transparent text-sm outline-none placeholder:text-bonk-faint"
            />
          </div>
          <div className="flex rounded-xl border border-bonk-line bg-black/30 p-0.5">
            {(["all", "owned", "unowned"] as OwnershipFilter[]).map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  filter === option
                    ? "bg-bonk-green text-[#04150b]"
                    : "text-bonk-muted hover:text-bonk-text",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      {collectionLoading && champions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-bonk-muted">
          <Loader2 className="size-6 animate-spin text-bonk-green-bright" />
          <p className="text-sm">Pulling your collection from League…</p>
        </div>
      ) : champions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-bonk-muted">
          <Layers className="size-8 text-bonk-faint" />
          <p className="text-sm">No collection data. Open League and try again.</p>
          <button
            onClick={() => void loadCollection()}
            className="rounded-lg bg-bonk-green px-4 py-2 text-sm font-semibold text-[#04150b]"
          >
            Reload
          </button>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(92px,1fr))] content-start gap-3 overflow-y-auto bonk-scroll pr-1">
          {filtered.map((champ) => (
            <motion.button
              key={champ.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedChampionId(champ.id)}
              className="group flex flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  "relative size-[72px] overflow-hidden rounded-xl border transition-colors",
                  champ.owned
                    ? "border-bonk-line group-hover:border-bonk-green/50"
                    : "border-bonk-line/60",
                )}
              >
                <img
                  src={championIconSrc(champ.id)}
                  alt={champ.name}
                  onError={(event) => {
                    event.currentTarget.style.opacity = "0";
                  }}
                  className={cn(
                    "size-full object-cover",
                    !champ.owned && "opacity-40 grayscale",
                  )}
                />
                {!champ.owned && (
                  <span className="absolute inset-0 grid place-items-center">
                    <Lock className="size-4 text-white/70" />
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "max-w-[80px] truncate text-[11px]",
                  champ.owned ? "text-bonk-text" : "text-bonk-faint",
                )}
              >
                {champ.name}
              </span>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedChampion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedChampionId(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[85vh] w-[720px] flex-col overflow-hidden rounded-3xl border border-bonk-line bg-bonk-panel-strong backdrop-blur-2xl"
            >
              <header className="flex items-center justify-between border-b border-bonk-line px-6 py-4">
                <div className="flex items-center gap-3">
                  <img
                    src={championIconSrc(selectedChampion.id)}
                    alt={selectedChampion.name}
                    className="size-11 rounded-lg object-cover"
                  />
                  <div>
                    <h2 className="font-display text-xl font-bold">{selectedChampion.name}</h2>
                    <p className="text-xs text-bonk-muted">
                      {selectedChampion.owned ? "Owned" : "Not owned"} ·{" "}
                      {championSkins.filter((skin) => skin.owned).length}/{championSkins.length} skins
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedChampionId(null)}
                  className="flex size-9 items-center justify-center rounded-lg text-bonk-muted hover:bg-white/5 hover:text-bonk-text"
                >
                  <X className="size-4" />
                </button>
              </header>

              <div className="grid grid-cols-2 gap-3 overflow-y-auto bonk-scroll p-6 sm:grid-cols-3">
                {championSkins.map((skin) => (
                  <div
                    key={skin.id}
                    className={cn(
                      "relative aspect-[3/4] overflow-hidden rounded-xl border",
                      skin.owned ? "border-bonk-green/50" : "border-bonk-line",
                    )}
                  >
                    {skin.tilePath ? (
                      <img
                        src={perkIconSrc(skin.tilePath)}
                        alt={skin.name}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                        className={cn(
                          "size-full object-cover",
                          !skin.owned && "opacity-50 grayscale",
                        )}
                      />
                    ) : (
                      <div className="size-full bg-black/40" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                      <p className="truncate text-[11px] font-medium text-white">{skin.name}</p>
                    </div>
                    <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-black/60">
                      {skin.owned ? (
                        <Check className="size-3 text-bonk-green-bright" />
                      ) : (
                        <Lock className="size-3 text-white/70" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
