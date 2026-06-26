import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, Loader2, ShoppingBag, Tag } from "lucide-react";

import { championIconSrc, perkIconSrc } from "@/lib/league-helpers";
import type { LeagueClient } from "@/lib/useLeagueClient";
import { cn } from "@/lib/utils";

type StoreTab = "champions" | "skins";

function skinTileSrc(item: LeagueStoreItem) {
  if (item.tilePath) return perkIconSrc(item.tilePath);
  const championId = Math.floor(item.id / 1000);
  return perkIconSrc(`/lol-game-data/assets/v1/champion-tiles/${championId}/${item.id}.jpg`);
}

function PriceTag({ item }: { item: LeagueStoreItem }) {
  if (item.sale) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-bonk-gold">
        <Tag className="size-3" />
        {item.sale.cost} {item.sale.currency === "RP" ? "RP" : "BE"}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-bonk-muted">
      {item.rp != null && `${item.rp} RP`}
      {item.rp != null && item.be != null && " · "}
      {item.be != null && `${item.be} BE`}
      {item.rp == null && item.be == null && "—"}
    </span>
  );
}

export function StoreScreen({ client }: { client: LeagueClient }) {
  const { store, storeLoading, loadStore } = client;
  const [tab, setTab] = useState<StoreTab>("champions");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!store && !storeLoading) void loadStore();
  }, [store, storeLoading, loadStore]);

  const items = tab === "champions" ? store?.champions ?? [] : store?.skins ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => !query || item.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 flex h-full flex-col gap-4 p-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bonk-green-bright">
            Store
          </p>
          <h1 className="font-display text-2xl font-bold">Champions & Skins</h1>
          <p className="mt-1 text-xs text-bonk-muted">
            Browsing only — purchases happen in the League client.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {store?.wallet && (
            <div className="flex items-center gap-3 rounded-xl border border-bonk-line bg-black/30 px-4 py-2">
              <span className="text-sm font-semibold text-bonk-text">
                {store.wallet.rp.toLocaleString()} <span className="text-bonk-faint">RP</span>
              </span>
              <span className="h-4 w-px bg-bonk-line" />
              <span className="text-sm font-semibold text-bonk-text">
                {store.wallet.be.toLocaleString()} <span className="text-bonk-faint">BE</span>
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-xl border border-bonk-line bg-black/30 p-0.5">
          {(["champions", "skins"] as StoreTab[]).map((option) => (
            <button
              key={option}
              onClick={() => setTab(option)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                tab === option
                  ? "bg-bonk-green text-[#04150b]"
                  : "text-bonk-muted hover:text-bonk-text",
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-bonk-line bg-black/30 px-3">
          <Search className="size-4 text-bonk-faint" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${tab}`}
            className="h-9 w-44 bg-transparent text-sm outline-none placeholder:text-bonk-faint"
          />
        </div>
      </div>

      {storeLoading && !store ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-bonk-muted">
          <Loader2 className="size-6 animate-spin text-bonk-green-bright" />
          <p className="text-sm">Loading the store…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-bonk-muted">
          <ShoppingBag className="size-8 text-bonk-faint" />
          <p className="text-sm">
            {store ? "Nothing to show here." : "Open League to load the store."}
          </p>
          {!store && (
            <button
              onClick={() => void loadStore()}
              className="rounded-lg bg-bonk-green px-4 py-2 text-sm font-semibold text-[#04150b]"
            >
              Reload
            </button>
          )}
        </div>
      ) : tab === "champions" ? (
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(110px,1fr))] content-start gap-3 overflow-y-auto bonk-scroll pr-1">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col items-center gap-2 rounded-2xl border border-bonk-line bg-bonk-panel p-3"
            >
              <img
                src={championIconSrc(item.championId)}
                alt={item.name}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.opacity = "0";
                }}
                className="size-16 rounded-xl object-cover"
              />
              <span className="max-w-full truncate text-xs font-medium text-bonk-text">
                {item.name}
              </span>
              <PriceTag item={item} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start gap-3 overflow-y-auto bonk-scroll pr-1">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-bonk-line bg-bonk-panel"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={skinTileSrc(item)}
                  alt={item.name}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.opacity = "0";
                  }}
                  className="size-full object-cover"
                />
                {item.sale && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-bonk-gold/90 px-1.5 py-0.5 text-[9px] font-bold text-black">
                    SALE
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5">
                <span className="truncate text-xs font-medium text-bonk-text">{item.name}</span>
                <PriceTag item={item} />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
