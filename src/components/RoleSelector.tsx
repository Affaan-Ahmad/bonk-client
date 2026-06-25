import { motion } from "motion/react";
import { AlertCircle } from "lucide-react";

import { ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

function RoleRow({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (role: string) => void;
  invalid: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-bonk-faint">
        {label}
      </span>
      <div className="flex gap-1">
        {ROLES.map((role) => {
          const selected = value === role;
          return (
            <motion.button
              key={role}
              whileTap={{ scale: 0.94 }}
              onClick={() => onChange(role)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                selected
                  ? cn(
                      "text-[#04150b]",
                      invalid ? "bg-bonk-danger text-white" : "bg-bonk-green",
                    )
                  : "bg-white/[0.04] text-bonk-muted hover:bg-white/[0.08] hover:text-bonk-text",
              )}
            >
              {role}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function RoleSelector({
  primary,
  secondary,
  onPrimaryChange,
  onSecondaryChange,
}: {
  primary: string;
  secondary: string;
  onPrimaryChange: (role: string) => void;
  onSecondaryChange: (role: string) => void;
}) {
  // Same role is only valid if one of them is Fill.
  const invalid =
    primary === secondary && primary !== "Fill" && secondary !== "Fill";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
        <RoleRow
          label="Primary role"
          value={primary}
          onChange={onPrimaryChange}
          invalid={invalid}
        />
        <RoleRow
          label="Secondary role"
          value={secondary}
          onChange={onSecondaryChange}
          invalid={invalid}
        />
      </div>
      {invalid && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs text-bonk-danger"
        >
          <AlertCircle className="size-3.5" />
          Pick two different roles, or set one to Fill.
        </motion.p>
      )}
    </div>
  );
}
