import { motion } from "motion/react";
import { Check, Lock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MODE_CATEGORIES, QUEUE_OPTIONS } from "@/lib/constants";
import { getQueueDisabledReason, isQueueAvailable } from "@/lib/league-helpers";
import { cn } from "@/lib/utils";
import type { ModeCategory } from "@/types/league";

export function GameModeDialog({
  open,
  onOpenChange,
  category,
  onCategoryChange,
  selectedQueueId,
  knownGameQueues,
  findKnownQueue,
  onSelectMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ModeCategory;
  onCategoryChange: (category: ModeCategory) => void;
  selectedQueueId: number;
  knownGameQueues: LeagueGameQueue[];
  findKnownQueue: (queueId: number) => LeagueGameQueue | undefined;
  onSelectMode: (queueId: number) => void;
}) {
  const visible = QUEUE_OPTIONS.filter((queue) => queue.category === category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-bonk-line bg-popover/95 backdrop-blur-2xl">
        <DialogHeader>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bonk-green-bright">
            Play
          </p>
          <DialogTitle className="font-display text-2xl">Game Modes</DialogTitle>
        </DialogHeader>

        <Tabs
          value={category}
          onValueChange={(value) => onCategoryChange(value as ModeCategory)}
          className="mt-2"
        >
          <TabsList className="bg-white/[0.04]">
            {MODE_CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                disabled={cat.id === "tft"}
                className="data-[state=active]:bg-bonk-green-dim data-[state=active]:text-bonk-green-bright"
              >
                {cat.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {category === "tft" ? (
            <div className="col-span-2 rounded-xl border border-bonk-line bg-white/[0.02] p-6 text-center text-sm text-bonk-muted">
              Teamfight Tactics runs a separate flow. It can be added once the League
              queue path is complete.
            </div>
          ) : (
            visible.map((queue) => {
              const knownQueue = findKnownQueue(queue.queueId);
              const unavailable =
                Boolean(queue.disabledReason) ||
                (knownGameQueues.length > 0 &&
                  (!knownQueue || !isQueueAvailable(knownQueue)));
              const selected = selectedQueueId === queue.queueId;

              return (
                <motion.button
                  key={queue.queueId}
                  whileHover={unavailable ? undefined : { y: -3 }}
                  whileTap={unavailable ? undefined : { scale: 0.98 }}
                  disabled={unavailable}
                  onClick={() => onSelectMode(queue.queueId)}
                  className={cn(
                    "relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors",
                    unavailable
                      ? "cursor-not-allowed border-bonk-line bg-white/[0.015] opacity-55"
                      : selected
                        ? "border-bonk-green/60 bg-bonk-green-dim shadow-[0_0_30px_-12px_var(--bonk-green)]"
                        : "border-bonk-line bg-white/[0.03] hover:border-bonk-green/40 hover:bg-white/[0.05]",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <Badge
                      variant="outline"
                      className="border-bonk-line text-[10px] text-bonk-muted"
                    >
                      {queue.note ?? "Mode"}
                    </Badge>
                    {selected && !unavailable && (
                      <Check className="size-4 text-bonk-green-bright" />
                    )}
                    {unavailable && <Lock className="size-3.5 text-bonk-faint" />}
                  </div>
                  <strong className="font-display text-base text-bonk-text">
                    {queue.label}
                  </strong>
                  <small className="text-xs text-bonk-muted">
                    {queue.disabledReason ??
                      (unavailable
                        ? getQueueDisabledReason(knownQueue)
                        : queue.description)}
                  </small>
                </motion.button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
