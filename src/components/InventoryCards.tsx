import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, Frame } from "lucide-react";

import { CARD_SKINS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CardAccent } from "@/types/league";

const ACCENT_SWATCH: Record<CardAccent, string> = {
  green: "from-bonk-green to-[#0f7a39]",
  gold: "from-bonk-gold to-[#9c7f2e]",
  blue: "from-bonk-blue to-[#2d5fb0]",
  teal: "from-bonk-teal to-[#1c8576]",
  violet: "from-bonk-violet to-[#5b41b0]",
  empty: "from-white/10 to-transparent",
};

export function InventoryCards({
  open,
  onToggle,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onToggle: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="w-full max-w-3xl">
      <button
        onClick={onToggle}
        className="mx-auto flex items-center gap-2 rounded-full border border-bonk-line bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-bonk-muted transition-colors hover:text-bonk-text"
      >
        <Frame className="size-3.5" />
        Card frames
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {CARD_SKINS.map((skin) => {
                const selected = selectedId === skin.id;
                return (
                  <motion.button
                    key={skin.id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onSelect(skin.id)}
                    className={cn(
                      "relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors",
                      selected
                        ? "border-bonk-green/60 bg-bonk-green-dim"
                        : "border-bonk-line bg-white/[0.03] hover:border-white/20",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={cn(
                          "h-6 w-10 rounded-md bg-gradient-to-br",
                          ACCENT_SWATCH[skin.accent],
                        )}
                      />
                      {selected && <Check className="size-4 text-bonk-green-bright" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-bonk-faint">
                        {skin.rarity}
                      </p>
                      <strong className="font-display text-sm text-bonk-text">
                        {skin.name}
                      </strong>
                    </div>
                    <small className="text-[11px] leading-snug text-bonk-muted">
                      {skin.description}
                    </small>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
