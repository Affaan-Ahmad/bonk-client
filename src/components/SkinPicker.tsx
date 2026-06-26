import { motion } from "motion/react";
import { Lock, Check } from "lucide-react";

import { perkIconSrc } from "@/lib/league-helpers";
import { cn } from "@/lib/utils";

function skinTilePath(skinId: number) {
  const championId = Math.floor(skinId / 1000);
  return `/lol-game-data/assets/v1/champion-tiles/${championId}/${skinId}.jpg`;
}

export function SkinPicker({
  skins,
  selectedSkinId,
  onSelectSkin,
}: {
  skins: LeagueSkinCarouselSkin[];
  selectedSkinId: number | null;
  onSelectSkin: (skinId: number) => void;
}) {
  if (skins.length === 0) return null;

  return (
    <div className="rounded-2xl border border-bonk-line bg-bonk-panel p-4 backdrop-blur-xl">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-bonk-faint">
        Skins
      </p>
      <div className="flex gap-2 overflow-x-auto bonk-scroll pb-1">
        {skins.map((skin) => {
          const owned = skin.unlocked ?? skin.ownership?.owned ?? false;
          const selected = selectedSkinId === skin.id;
          return (
            <motion.button
              key={skin.id}
              whileTap={owned ? { scale: 0.96 } : undefined}
              disabled={!owned || skin.disabled}
              onClick={() => onSelectSkin(skin.id)}
              title={skin.name}
              className={cn(
                "relative aspect-[3/4] w-[68px] shrink-0 overflow-hidden rounded-lg border transition-all",
                selected
                  ? "border-bonk-green shadow-[0_0_14px_-3px_var(--bonk-green)]"
                  : owned
                    ? "border-bonk-line hover:border-bonk-green/40"
                    : "border-bonk-line/60 cursor-not-allowed",
              )}
            >
              <img
                src={perkIconSrc(skinTilePath(skin.id))}
                alt={skin.name}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
                className={cn("size-full object-cover", !owned && "opacity-40 grayscale")}
              />
              {!owned && (
                <span className="absolute inset-0 grid place-items-center">
                  <Lock className="size-3.5 text-white/70" />
                </span>
              )}
              {selected && (
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-black/60">
                  <Check className="size-2.5 text-bonk-green-bright" />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
