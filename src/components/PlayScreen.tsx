import { useState } from "react";
import { motion } from "motion/react";
import { Gamepad2, Users, Loader2, UserPlus } from "lucide-react";

import { PartyCards } from "@/components/PartyCards";
import { RoleSelector } from "@/components/RoleSelector";
import { InventoryCards } from "@/components/InventoryCards";
import { GameModeDialog } from "@/components/GameModeDialog";
import { Switch } from "@/components/ui/switch";
import { QUEUE_OPTIONS } from "@/lib/constants";
import { formatQueueName } from "@/lib/league-helpers";
import { cn } from "@/lib/utils";
import type { LeagueClient } from "@/lib/useLeagueClient";
import type { ModeCategory } from "@/types/league";

export function PlayScreen({
  client,
  onOpenFriends,
  onInviteFriend,
}: {
  client: LeagueClient;
  onOpenFriends: () => void;
  onInviteFriend: (summonerId: number | undefined, name: string) => void;
}) {
  const [modesOpen, setModesOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFriendDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const raw = event.dataTransfer.getData("application/bonk-friend");
    if (!raw) return;
    try {
      const friend = JSON.parse(raw) as { summonerId?: number; name: string };
      onInviteFriend(friend.summonerId, friend.name);
    } catch {
      // Ignore malformed drops.
    }
  };
  const [category, setCategory] = useState<ModeCategory>("rift");

  const {
    lobby,
    isInLeagueLobby,
    isInMatchmaking,
    isReadyCheckActive,
    currentQueueId,
    selectedQueueId,
    knownGameQueues,
    findKnownQueue,
    queueElapsedLabel,
    actionStatus,
    accountStatus,
    autoAccept,
    setAutoAccept,
    selectedRole,
    selectedSecondaryRole,
    changePrimaryRole,
    changeSecondaryRole,
    selectedCardSkinId,
    setSelectedCardSkinId,
    createLeagueLobby,
    handleQueueButton,
    setActionStatus,
  } = client;

  const searching = isInMatchmaking && !isReadyCheckActive;
  const selectedQueue =
    QUEUE_OPTIONS.find((queue) => queue.queueId === selectedQueueId) ?? QUEUE_OPTIONS[0];
  const headlineQueue = isInLeagueLobby
    ? formatQueueName(currentQueueId)
    : selectedQueue.label;

  const queueLabel = searching
    ? "Leave Queue"
    : isInLeagueLobby
      ? "Find Match"
      : "Create Party";

  return (
    <section className="relative z-10 flex h-full flex-col items-center justify-between gap-6 px-8 py-6">
      {/* Toolbar */}
      <div className="flex w-full items-center justify-between">
        <button
          onClick={() => setModesOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-bonk-line bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-bonk-text transition-colors hover:border-bonk-green/40 hover:bg-white/[0.07]"
        >
          <Gamepad2 className="size-4 text-bonk-green-bright" />
          Game Modes
        </button>

        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bonk-faint">
            {isInLeagueLobby ? "Current lobby" : "Selected queue"}
          </p>
          <h2 className="font-display text-xl font-bold">{headlineQueue}</h2>
        </div>

        <button
          onClick={onOpenFriends}
          className="flex items-center gap-2 rounded-xl border border-bonk-line bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-bonk-text transition-colors hover:border-bonk-green/40 hover:bg-white/[0.07]"
        >
          <Users className="size-4" />
          Friends
        </button>
      </div>

      {/* Party cards — drop a friend here to invite */}
      <div
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("application/bonk-friend")) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            if (!dragOver) setDragOver(true);
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDrop={handleFriendDrop}
        className="relative flex flex-1 flex-col items-center justify-center gap-2"
      >
        <PartyCards slots={lobby} onInvite={onOpenFriends} />
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pointer-events-none absolute inset-4 z-10 flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-bonk-green/70 bg-bonk-bg/50 backdrop-blur-[1px]"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-bonk-green text-[#04150b]">
              <UserPlus className="size-6" />
            </span>
            <strong className="font-display text-lg text-bonk-green-bright">
              Drop to invite
            </strong>
          </motion.div>
        )}
      </div>

      {/* Queue console */}
      <div className="flex w-full max-w-3xl flex-col items-center gap-4">
        <RoleSelector
          primary={selectedRole}
          secondary={selectedSecondaryRole}
          onPrimaryChange={changePrimaryRole}
          onSecondaryChange={changeSecondaryRole}
        />

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => void handleQueueButton()}
          className={cn(
            "relative flex h-14 w-full max-w-md items-center justify-center gap-2 overflow-hidden rounded-2xl font-display text-lg font-bold transition-colors",
            searching
              ? "bg-bonk-danger/15 text-bonk-danger border border-bonk-danger/40"
              : "bg-bonk-green text-[#04150b] shadow-[0_0_40px_-10px_var(--bonk-green)] hover:bg-bonk-green-bright",
          )}
        >
          {searching && (
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-2xl"
              animate={{ boxShadow: [
                "inset 0 0 0 1px rgba(255,82,103,0.3)",
                "inset 0 0 24px 2px rgba(255,82,103,0.45)",
                "inset 0 0 0 1px rgba(255,82,103,0.3)",
              ] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          )}
          {searching && <Loader2 className="size-5 animate-spin" />}
          <span>{queueLabel}</span>
          {searching && (
            <span className="font-mono text-base tabular-nums">{queueElapsedLabel}</span>
          )}
        </motion.button>

        <div className="flex items-center gap-4 text-xs text-bonk-muted">
          <span>{searching ? `Searching · ${queueElapsedLabel}` : actionStatus}</span>
          <span className="text-bonk-faint">·</span>
          <span>{accountStatus}</span>
          <label className="flex items-center gap-2">
            <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
            Auto Accept
          </label>
        </div>

        <InventoryCards
          open={inventoryOpen}
          onToggle={() => setInventoryOpen((value) => !value)}
          selectedId={selectedCardSkinId}
          onSelect={setSelectedCardSkinId}
        />
      </div>

      <GameModeDialog
        open={modesOpen}
        onOpenChange={setModesOpen}
        category={category}
        onCategoryChange={setCategory}
        selectedQueueId={selectedQueueId}
        knownGameQueues={knownGameQueues}
        findKnownQueue={findKnownQueue}
        onSelectMode={(queueId) => {
          setModesOpen(false);
          void createLeagueLobby(queueId);
          setActionStatus("Lobby updating…");
        }}
      />
    </section>
  );
}
