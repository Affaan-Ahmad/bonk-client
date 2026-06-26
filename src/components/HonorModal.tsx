import { motion, AnimatePresence } from "motion/react";
import { Heart } from "lucide-react";

import { championIconSrc, formatPosition } from "@/lib/league-helpers";
import type { LeagueClient } from "@/lib/useLeagueClient";

export function HonorModal({ client }: { client: LeagueClient }) {
  const { honorBallot, honorPlayer } = client;
  const players = honorBallot?.players ?? [];

  return (
    <AnimatePresence>
      {honorBallot && players.length > 0 && (
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
            className="relative w-[460px] overflow-hidden rounded-3xl border border-bonk-green/30 bg-bonk-panel-strong p-8 backdrop-blur-2xl"
          >
            <div className="text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-bonk-green-bright">
                Game Over
              </p>
              <h2 className="mt-1 flex items-center justify-center gap-2 font-display text-3xl font-bold">
                <Heart className="size-6 text-bonk-green-bright" />
                Honor a Teammate
              </h2>
              <p className="mt-2 text-sm text-bonk-muted">
                Recognize someone who made the game better.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-2">
              {players.map((player) => (
                <motion.button
                  key={player.summonerId}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => honorPlayer(player.summonerId)}
                  className="flex items-center gap-3 rounded-2xl border border-bonk-line bg-black/30 p-3 text-left transition-colors hover:border-bonk-green/50 hover:bg-bonk-green/5"
                >
                  {player.championId > 0 ? (
                    <img
                      src={championIconSrc(player.championId)}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.opacity = "0";
                      }}
                      className="size-11 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-xl bg-bonk-line text-sm font-bold text-bonk-muted">
                      {player.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-bonk-text">{player.name}</p>
                    {player.position && (
                      <p className="text-xs text-bonk-faint">{formatPosition(player.position)}</p>
                    )}
                  </div>
                  <Heart className="size-4 text-bonk-faint" />
                </motion.button>
              ))}
            </div>

            <button
              onClick={() => honorPlayer(0)}
              className="mt-5 w-full rounded-xl border border-bonk-line py-2.5 text-sm font-medium text-bonk-muted transition-colors hover:text-bonk-text"
            >
              Skip — honor no one
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
