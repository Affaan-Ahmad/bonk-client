import { useState } from "react";
import { UserPlus, Users } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import type { FriendView } from "@/types/league";

export function FriendsDrawer({
  open,
  onOpenChange,
  getFriends,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getFriends: (query: string) => FriendView[];
  onInvite: (friend: FriendView) => void;
}) {
  const [search, setSearch] = useState("");
  const friends = getFriends(search);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="flex w-[340px] flex-col gap-0 border-l border-bonk-line bg-popover/95 p-0 backdrop-blur-2xl sm:max-w-[340px]"
      >
        <SheetHeader className="border-b border-bonk-line p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bonk-green-bright">
                Social
              </p>
              <SheetTitle className="font-display text-xl">Friends</SheetTitle>
            </div>
            <Badge
              variant="outline"
              className="gap-1 border-bonk-line text-bonk-muted"
            >
              <Users className="size-3" />
              {friends.length}
            </Badge>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search friends"
            className="mt-3 border-bonk-line bg-white/[0.04]"
          />
        </SheetHeader>

        <ScrollArea className="flex-1 bonk-scroll">
          <div className="flex flex-col gap-1 p-3">
            {friends.length === 0 ? (
              <div className="mt-16 flex flex-col items-center gap-1 px-6 text-center">
                <Users className="mb-1 size-7 text-bonk-faint" />
                <strong className="text-sm text-bonk-text">No friends found</strong>
                <small className="text-xs text-bonk-muted">
                  Try another search, or open League to sync your list.
                </small>
              </div>
            ) : (
              friends.map((friend, index) => (
                <article
                  key={friend.name}
                  style={{ animationDelay: `${Math.min(index * 25, 300)}ms` }}
                  draggable={friend.status !== "Offline" && Boolean(friend.summonerId)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/bonk-friend",
                      JSON.stringify({ summonerId: friend.summonerId, name: friend.name }),
                    );
                    event.dataTransfer.setData("text/plain", friend.name);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  className={cn(
                    "group flex animate-in items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 fade-in slide-in-from-right-2 transition-colors hover:border-bonk-line hover:bg-white/[0.03]",
                    friend.status !== "Offline" &&
                      friend.summonerId &&
                      "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <StatusDot status={friend.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-bonk-text">
                      {friend.name}
                    </p>
                    <p className="truncate text-[11px] text-bonk-muted">
                      {friend.status} · {friend.rank}
                    </p>
                  </div>
                  <button
                    onClick={() => onInvite(friend)}
                    disabled={friend.status === "Offline" || !friend.summonerId}
                    className="flex size-8 items-center justify-center rounded-lg text-bonk-muted opacity-0 transition-all hover:bg-bonk-green-dim hover:text-bonk-green-bright group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
                    title={`Invite ${friend.name}`}
                  >
                    <UserPlus className="size-4" />
                  </button>
                </article>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
