import { motion, AnimatePresence } from "motion/react";
import { Check, X } from "lucide-react";

import { Switch } from "@/components/ui/switch";

export function ReadyCheckModal({
  active,
  canRespond,
  seconds,
  progress,
  autoAccept,
  onAutoAcceptChange,
  onAccept,
  onDecline,
  responseLabel,
}: {
  active: boolean;
  canRespond: boolean;
  seconds: number | null;
  progress: number;
  autoAccept: boolean;
  onAutoAcceptChange: (value: boolean) => void;
  onAccept: () => void;
  onDecline: () => void;
  responseLabel?: string;
}) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="relative w-[420px] overflow-hidden rounded-3xl border border-bonk-green/30 bg-bonk-panel-strong p-8 text-center backdrop-blur-2xl"
          >
            {/* Pulsing glow ring */}
            <motion.div
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_0_60px_-10px_var(--bonk-green)]"
            />

            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-bonk-green-bright">
              Match Found
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold">
              {autoAccept ? "Auto Accept Armed" : "Ready Check"}
            </h2>

            {seconds !== null && (
              <motion.div
                key={seconds}
                initial={{ scale: 1.25, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-4 font-mono text-6xl font-bold text-bonk-green-bright tabular-nums"
              >
                {seconds}
              </motion.div>
            )}

            <p className="mt-3 text-sm text-bonk-muted">
              {canRespond
                ? "Accept the match to enter champion select."
                : `Response: ${responseLabel ?? "Waiting"}`}
            </p>

            {/* Shrinking progress bar */}
            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.span
                className="block h-full rounded-full bg-bonk-green"
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.9 }}
              />
            </div>

            <div className="mt-6 flex gap-3">
              <motion.button
                whileHover={canRespond ? { scale: 1.03 } : undefined}
                whileTap={canRespond ? { scale: 0.97 } : undefined}
                disabled={!canRespond}
                onClick={onAccept}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-bonk-green py-3 font-display font-semibold text-[#04150b] shadow-[0_0_30px_-8px_var(--bonk-green)] transition-opacity hover:bg-bonk-green-bright disabled:opacity-40"
              >
                <Check className="size-5" />
                Accept
              </motion.button>
              <motion.button
                whileHover={canRespond ? { scale: 1.03 } : undefined}
                whileTap={canRespond ? { scale: 0.97 } : undefined}
                disabled={!canRespond}
                onClick={onDecline}
                className="flex items-center justify-center gap-2 rounded-xl border border-bonk-danger/40 bg-bonk-danger/10 px-5 py-3 font-display font-semibold text-bonk-danger transition-colors hover:bg-bonk-danger/20 disabled:opacity-40"
              >
                <X className="size-5" />
                Decline
              </motion.button>
            </div>

            <label className="mt-5 flex items-center justify-center gap-2.5 text-xs text-bonk-muted">
              <Switch checked={autoAccept} onCheckedChange={onAutoAcceptChange} />
              Auto Accept future matches
            </label>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
