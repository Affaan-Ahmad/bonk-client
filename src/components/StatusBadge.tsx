import { cn } from "@/lib/utils";
import type { FriendStatus } from "@/types/league";

const STATUS_STYLES: Record<FriendStatus, { dot: string; text: string }> = {
  Online: { dot: "bg-bonk-green shadow-[0_0_10px_var(--bonk-green)]", text: "text-bonk-green-bright" },
  "In Game": { dot: "bg-bonk-blue shadow-[0_0_10px_var(--bonk-blue)]", text: "text-bonk-blue" },
  Away: { dot: "bg-bonk-gold shadow-[0_0_8px_var(--bonk-gold)]", text: "text-bonk-gold" },
  Offline: { dot: "bg-bonk-faint", text: "text-bonk-faint" },
};

export function StatusDot({
  status,
  className,
}: {
  status: FriendStatus;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-2.5 rounded-full", STATUS_STYLES[status].dot, className)}
      aria-hidden="true"
    />
  );
}

export function StatusBadge({ status }: { status: FriendStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusDot status={status} />
      <span className={cn("text-xs font-medium", style.text)}>{status}</span>
    </span>
  );
}
