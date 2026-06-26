import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { X, Save } from "lucide-react";

import { perkIconSrc } from "@/lib/league-helpers";
import { cn } from "@/lib/utils";

// Stat shards are global and stable across patches. If a patch changes them,
// update this table. Icons are pulled from the perk list when available.
const STAT_SHARD_ROWS: { label: string; options: { id: number; label: string }[] }[] = [
  {
    label: "Offense",
    options: [
      { id: 5008, label: "Adaptive Force" },
      { id: 5005, label: "Attack Speed" },
      { id: 5007, label: "Ability Haste" },
    ],
  },
  {
    label: "Flex",
    options: [
      { id: 5008, label: "Adaptive Force" },
      { id: 5010, label: "Move Speed" },
      { id: 5001, label: "Health Scaling" },
    ],
  },
  {
    label: "Defense",
    options: [
      { id: 5011, label: "Health" },
      { id: 5013, label: "Tenacity" },
      { id: 5001, label: "Health Scaling" },
    ],
  },
];

function getStyleSlots(style?: LeaguePerkStyle) {
  const slots = style?.slots ?? [];
  const keystoneSlot =
    slots.find((slot) => /keystone/i.test(slot.type ?? "")) ?? slots[0];
  const runeRows = slots
    .filter(
      (slot) =>
        slot !== keystoneSlot &&
        !/statmod/i.test(slot.type ?? "") &&
        (slot.perks?.length ?? 0) > 0,
    )
    .slice(0, 3);
  return { keystoneSlot, runeRows };
}

function PerkIcon({
  perk,
  selected,
  onClick,
  size = "md",
}: {
  perk?: LeaguePerk;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const dimension = size === "lg" ? "size-12" : size === "sm" ? "size-8" : "size-10";
  return (
    <button
      onClick={onClick}
      title={perk?.name}
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-full border bg-black/40 transition-all",
        dimension,
        selected
          ? "border-bonk-green shadow-[0_0_14px_-2px_var(--bonk-green)]"
          : "border-bonk-line opacity-60 hover:opacity-100",
      )}
    >
      <span className="absolute text-[9px] font-semibold text-bonk-faint">
        {perk?.name?.slice(0, 2) ?? "?"}
      </span>
      {perk?.iconPath && (
        <img
          src={perkIconSrc(perk.iconPath)}
          alt={perk.name}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="relative size-full object-cover"
        />
      )}
    </button>
  );
}

export function RuneEditor({
  perkStyles,
  perks,
  currentPage,
  recommendedRunePages,
  onSave,
  onClose,
}: {
  perkStyles: LeaguePerkStyle[];
  perks: LeaguePerk[];
  currentPage: LeagueRunePage | null;
  recommendedRunePages: LeagueRunePage[];
  onSave: (page: LeagueRunePage) => void;
  onClose: () => void;
}) {
  const perkById = useMemo(() => {
    const map = new Map<number, LeaguePerk>();
    perks.forEach((perk) => map.set(perk.id, perk));
    return map;
  }, [perks]);

  const initial = currentPage?.selectedPerkIds ?? [];
  const [name, setName] = useState(currentPage?.name ?? "BONK Custom");
  const [primaryStyleId, setPrimaryStyleId] = useState(
    currentPage?.primaryStyleId ?? perkStyles[0]?.id ?? 0,
  );
  const [subStyleId, setSubStyleId] = useState(
    currentPage?.subStyleId ?? perkStyles[1]?.id ?? 0,
  );
  const [keystoneId, setKeystoneId] = useState<number | null>(initial[0] ?? null);
  const [primaryPicks, setPrimaryPicks] = useState<(number | null)[]>([
    initial[1] ?? null,
    initial[2] ?? null,
    initial[3] ?? null,
  ]);
  const [secondaryPicks, setSecondaryPicks] = useState<number[]>(
    [initial[4], initial[5]].filter((id): id is number => Number(id) > 0),
  );
  const [shards, setShards] = useState<(number | null)[]>([
    initial[6] ?? null,
    initial[7] ?? null,
    initial[8] ?? null,
  ]);

  const primaryStyle = perkStyles.find((style) => style.id === primaryStyleId);
  const secondaryStyle = perkStyles.find((style) => style.id === subStyleId);
  const primary = getStyleSlots(primaryStyle);
  const secondary = getStyleSlots(secondaryStyle);

  const choosePrimaryStyle = (id: number) => {
    setPrimaryStyleId(id);
    setKeystoneId(null);
    setPrimaryPicks([null, null, null]);
    if (subStyleId === id) setSubStyleId(perkStyles.find((s) => s.id !== id)?.id ?? 0);
  };

  const chooseSecondaryStyle = (id: number) => {
    setSubStyleId(id);
    setSecondaryPicks([]);
  };

  // Load a full page (e.g. a recommended option) into the editor for tweaking.
  const loadPage = (page: LeagueRunePage) => {
    const ids = page.selectedPerkIds ?? [];
    setName(page.name ?? "BONK Custom");
    if (page.primaryStyleId) setPrimaryStyleId(page.primaryStyleId);
    if (page.subStyleId) setSubStyleId(page.subStyleId);
    setKeystoneId(ids[0] ?? null);
    setPrimaryPicks([ids[1] ?? null, ids[2] ?? null, ids[3] ?? null]);
    setSecondaryPicks([ids[4], ids[5]].filter((id): id is number => Number(id) > 0));
    setShards([ids[6] ?? null, ids[7] ?? null, ids[8] ?? null]);
  };

  const toggleSecondary = (perkId: number, rowPerks: number[]) => {
    setSecondaryPicks((previous) => {
      if (previous.includes(perkId)) return previous.filter((id) => id !== perkId);
      // One pick per row: drop any existing pick from this row.
      const withoutRow = previous.filter((id) => !rowPerks.includes(id));
      const next = [...withoutRow, perkId];
      return next.slice(-2); // keep at most two
    });
  };

  const complete =
    Boolean(keystoneId) &&
    primaryPicks.every((id) => Number(id) > 0) &&
    secondaryPicks.length === 2 &&
    shards.every((id) => Number(id) > 0) &&
    primaryStyleId > 0 &&
    subStyleId > 0;

  const handleSave = () => {
    if (!complete) return;
    const selectedPerkIds = [
      keystoneId!,
      ...primaryPicks.map((id) => id!),
      ...secondaryPicks,
      ...shards.map((id) => id!),
    ];
    onSave({
      id: currentPage?.id ?? 0,
      name: name.trim() || "BONK Custom",
      primaryStyleId,
      subStyleId,
      selectedPerkIds,
      current: true,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex max-h-[90vh] w-[760px] flex-col overflow-hidden rounded-3xl border border-bonk-line bg-bonk-panel-strong backdrop-blur-2xl"
      >
        <header className="flex items-center justify-between border-b border-bonk-line px-6 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bonk-green-bright">
              Runes
            </p>
            <h2 className="font-display text-xl font-bold">Rune Editor</h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Page name"
              className="h-9 w-44 rounded-lg border border-bonk-line bg-black/30 px-3 text-sm outline-none focus:border-bonk-green/50"
            />
            <button
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-lg text-bonk-muted hover:bg-white/5 hover:text-bonk-text"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 overflow-y-auto bonk-scroll p-6">
          {recommendedRunePages.length > 0 && (
            <div className="col-span-2">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-bonk-violet">
                Recommended — tap to load
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendedRunePages.map((page, index) => {
                  const keystone = perkById.get(page.selectedPerkIds?.[0] ?? 0);
                  const primaryStyle = perkStyles.find((style) => style.id === page.primaryStyleId);
                  const secondaryStyle = perkStyles.find((style) => style.id === page.subStyleId);
                  return (
                    <button
                      key={index}
                      onClick={() => loadPage(page)}
                      className="flex items-center gap-2 rounded-xl border border-bonk-violet/30 bg-bonk-violet/10 px-3 py-2 text-left transition-colors hover:bg-bonk-violet/20"
                    >
                      <span className="grid size-9 place-items-center overflow-hidden rounded-full border border-bonk-violet/40 bg-black/40">
                        {keystone?.iconPath ? (
                          <img
                            src={perkIconSrc(keystone.iconPath)}
                            alt={keystone.name}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] text-bonk-faint">{keystone?.name?.slice(0, 2) ?? "?"}</span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <strong className="block max-w-36 truncate text-xs text-bonk-text">
                          {page.name}
                        </strong>
                        <small className="text-[10px] text-bonk-muted">
                          {primaryStyle?.name ?? "—"} · {secondaryStyle?.name ?? "—"}
                        </small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary tree */}
          <section className="rounded-2xl border border-bonk-line bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2">
              {perkStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => choosePrimaryStyle(style.id)}
                  title={style.name}
                  className={cn(
                    "grid size-9 place-items-center overflow-hidden rounded-full border transition-all",
                    primaryStyleId === style.id
                      ? "border-bonk-green opacity-100"
                      : "border-bonk-line opacity-50 hover:opacity-90",
                  )}
                >
                  {style.iconPath ? (
                    <img src={perkIconSrc(style.iconPath)} alt={style.name} className="size-full object-cover" />
                  ) : (
                    <span className="text-[10px]">{style.name.slice(0, 1)}</span>
                  )}
                </button>
              ))}
            </div>
            <p className="mb-2 text-[11px] uppercase tracking-wider text-bonk-faint">
              {primaryStyle?.name} · Keystone
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {(primary.keystoneSlot?.perks ?? []).map((perkId) => (
                <PerkIcon
                  key={perkId}
                  perk={perkById.get(perkId)}
                  selected={keystoneId === perkId}
                  size="lg"
                  onClick={() => setKeystoneId(perkId)}
                />
              ))}
            </div>
            {primary.runeRows.map((slot, rowIndex) => (
              <div key={rowIndex} className="mb-2">
                <div className="flex flex-wrap gap-2">
                  {slot.perks.map((perkId) => (
                    <PerkIcon
                      key={perkId}
                      perk={perkById.get(perkId)}
                      selected={primaryPicks[rowIndex] === perkId}
                      onClick={() =>
                        setPrimaryPicks((previous) => {
                          const next = [...previous];
                          next[rowIndex] = perkId;
                          return next;
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Secondary tree + shards */}
          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border border-bonk-line bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2">
                {perkStyles
                  .filter((style) => style.id !== primaryStyleId)
                  .map((style) => (
                    <button
                      key={style.id}
                      onClick={() => chooseSecondaryStyle(style.id)}
                      title={style.name}
                      className={cn(
                        "grid size-9 place-items-center overflow-hidden rounded-full border transition-all",
                        subStyleId === style.id
                          ? "border-bonk-green opacity-100"
                          : "border-bonk-line opacity-50 hover:opacity-90",
                      )}
                    >
                      {style.iconPath ? (
                        <img src={perkIconSrc(style.iconPath)} alt={style.name} className="size-full object-cover" />
                      ) : (
                        <span className="text-[10px]">{style.name.slice(0, 1)}</span>
                      )}
                    </button>
                  ))}
              </div>
              <p className="mb-2 text-[11px] uppercase tracking-wider text-bonk-faint">
                {secondaryStyle?.name} · Pick 2
              </p>
              {secondary.runeRows.map((slot, rowIndex) => (
                <div key={rowIndex} className="mb-2 flex flex-wrap gap-2">
                  {slot.perks.map((perkId) => (
                    <PerkIcon
                      key={perkId}
                      perk={perkById.get(perkId)}
                      selected={secondaryPicks.includes(perkId)}
                      size="sm"
                      onClick={() => toggleSecondary(perkId, slot.perks)}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-bonk-line bg-white/[0.02] p-4">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-bonk-faint">
                Stat shards
              </p>
              {STAT_SHARD_ROWS.map((row, rowIndex) => (
                <div key={rowIndex} className="mb-2 flex items-center gap-2">
                  <span className="w-14 text-[10px] text-bonk-faint">{row.label}</span>
                  {row.options.map((option) => (
                    <button
                      key={`${rowIndex}-${option.id}`}
                      title={option.label}
                      onClick={() =>
                        setShards((previous) => {
                          const next = [...previous];
                          next[rowIndex] = option.id;
                          return next;
                        })
                      }
                      className={cn(
                        "grid size-8 place-items-center overflow-hidden rounded-full border text-[8px] transition-all",
                        shards[rowIndex] === option.id
                          ? "border-bonk-green text-bonk-green-bright"
                          : "border-bonk-line text-bonk-faint opacity-60 hover:opacity-100",
                      )}
                    >
                      {perkById.get(option.id)?.iconPath ? (
                        <img
                          src={perkIconSrc(perkById.get(option.id)?.iconPath)}
                          alt={option.label}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          className="size-full object-cover"
                        />
                      ) : (
                        option.label.slice(0, 2)
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-bonk-line px-6 py-4">
          <p className="text-xs text-bonk-muted">
            {complete ? "Ready to save" : "Pick a keystone, 3 primary, 2 secondary, and 3 shards"}
          </p>
          <motion.button
            whileTap={complete ? { scale: 0.97 } : undefined}
            disabled={!complete}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-bonk-green px-5 py-2.5 font-display font-semibold text-[#04150b] transition-opacity hover:bg-bonk-green-bright disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="size-4" />
            Save & apply
          </motion.button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
