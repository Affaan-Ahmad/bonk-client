import { motion } from "motion/react";
import { Crown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CardAccent, LobbySlot } from "@/types/league";

const ACCENT_RING: Record<CardAccent, string> = {
  green: "ring-bonk-green/60 shadow-[0_0_40px_-8px_var(--bonk-green)]",
  gold: "ring-bonk-gold/55 shadow-[0_0_40px_-10px_var(--bonk-gold)]",
  blue: "ring-bonk-blue/45 shadow-[0_0_38px_-12px_var(--bonk-blue)]",
  teal: "ring-bonk-teal/45 shadow-[0_0_38px_-12px_var(--bonk-teal)]",
  violet: "ring-bonk-violet/45 shadow-[0_0_38px_-12px_var(--bonk-violet)]",
  empty: "ring-bonk-line",
};

const ACCENT_PORTRAIT: Record<CardAccent, string> = {
  green: "from-bonk-green/30 to-transparent text-bonk-green-bright",
  gold: "from-bonk-gold/30 to-transparent text-bonk-gold",
  blue: "from-bonk-blue/30 to-transparent text-bonk-blue",
  teal: "from-bonk-teal/30 to-transparent text-bonk-teal",
  violet: "from-bonk-violet/30 to-transparent text-bonk-violet",
  empty: "from-white/5 to-transparent text-bonk-faint",
};

function PartyCard({
  slot,
  prominent,
  onInvite,
  index,
}: {
  slot: LobbySlot;
  prominent: boolean;
  onInvite: () => void;
  index: number;
}) {
  if (slot.status === "empty") {
    return (
      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.97 }}
        onClick={onInvite}
        className={cn(
          "group flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-bonk-line bg-white/[0.02] text-bonk-faint transition-colors hover:border-bonk-green/40 hover:text-bonk-green-bright",
          prominent ? "h-72 w-52" : "h-56 w-40",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-bonk-line transition-colors group-hover:border-bonk-green/50">
          <Plus className="size-5" />
        </span>
        <span className="text-sm font-semibold">Invite Player</span>
        <span className="text-[11px] text-bonk-faint">{slot.tag}</span>
      </motion.button>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45 }}
      whileHover={{ y: -6 }}
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-2xl bg-bonk-panel-strong p-4 ring-1 backdrop-blur-xl transition-shadow",
        ACCENT_RING[slot.accent],
        prominent ? "h-72 w-52" : "h-56 w-40",
      )}
    >
      <div
        className={cn(
          "mt-2 flex items-center justify-center rounded-2xl bg-gradient-to-b font-display font-bold",
          ACCENT_PORTRAIT[slot.accent],
          prominent ? "size-24 text-4xl" : "size-16 text-2xl",
        )}
      >
        {slot.name.slice(0, 1).toUpperCase()}
      </div>

      <span className="mt-3 rounded-full border border-bonk-line bg-black/30 px-2.5 py-0.5 text-[11px] font-medium text-bonk-muted">
        {slot.role}
      </span>

      <div className="mt-auto w-full text-center">
        <p className="truncate font-display text-sm font-semibold text-bonk-text">
          {slot.name}
          {slot.tag && <span className="ml-1 text-bonk-faint">{slot.tag}</span>}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-bonk-muted">
          {slot.rank}
          {slot.lp ? ` · ${slot.lp}` : ""}
        </p>
      </div>

      <div className="mt-2 flex items-center gap-1 text-[11px] font-medium">
        {slot.status === "leader" ? (
          <>
            <Crown className="size-3.5 text-bonk-gold" />
            <span className="text-bonk-gold">Leader</span>
          </>
        ) : (
          <span className="text-bonk-green-bright">Ready</span>
        )}
      </div>
    </motion.article>
  );
}

export function PartyCards({
  slots,
  onInvite,
}: {
  slots: LobbySlot[];
  onInvite: () => void;
}) {
  return (
    <div className="flex items-end justify-center gap-4">
      {slots.map((slot, index) => (
        <PartyCard
          key={`${slot.name}-${index}`}
          slot={slot}
          prominent={index === 2}
          index={index}
          onInvite={onInvite}
        />
      ))}
    </div>
  );
}
