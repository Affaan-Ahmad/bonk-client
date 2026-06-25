import { motion } from "motion/react";
import {
  Home,
  Swords,
  Layers,
  User,
  ShoppingBag,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/league";

const NAV: { item: NavItem; icon: LucideIcon }[] = [
  { item: "Home", icon: Home },
  { item: "Play", icon: Swords },
  { item: "Collection", icon: Layers },
  { item: "Profile", icon: User },
  { item: "Store", icon: ShoppingBag },
  { item: "Settings", icon: Settings },
];

export function Sidebar({
  active,
  onSelect,
  onExit,
}: {
  active: NavItem;
  onSelect: (item: NavItem) => void;
  onExit: () => void;
}) {
  return (
    <aside className="no-drag relative z-20 flex w-[88px] shrink-0 flex-col items-center gap-1 border-r border-bonk-line bg-[rgba(10,15,13,0.55)] py-5 backdrop-blur-xl">
      <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-bonk-green to-[#0f7a39] font-display text-xl font-bold text-[#04150b] shadow-[0_0_22px_var(--bonk-green-dim)]">
        B
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {NAV.map(({ item, icon: Icon }) => {
          const isActive = active === item;
          return (
            <Tooltip key={item} delayDuration={150}>
              <TooltipTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onSelect(item)}
                  className={cn(
                    "group relative flex w-[68px] flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-colors",
                    isActive
                      ? "bg-bonk-green-dim text-bonk-green-bright"
                      : "text-bonk-muted hover:bg-white/5 hover:text-bonk-text",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute -left-[1px] top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-bonk-green shadow-[0_0_10px_var(--bonk-green)]"
                    />
                  )}
                  <Icon className="size-5" strokeWidth={2} />
                  <span className="text-[10px] font-medium tracking-wide">{item}</span>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right">{item}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <Separator className="my-2 w-10 bg-bonk-line" />

      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onExit}
            className="flex w-[68px] flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-bonk-muted transition-colors hover:bg-bonk-danger/15 hover:text-bonk-danger"
          >
            <LogOut className="size-5" strokeWidth={2} />
            <span className="text-[10px] font-medium tracking-wide">Exit</span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="right">Quit BONK Client</TooltipContent>
      </Tooltip>
    </aside>
  );
}
