"use client";

import clsx from "clsx";
import { IconChevronDown, IconChevronUp, IconHome, IconX } from "@tabler/icons-react";
import type { Band } from "@/lib/timezone";

export type RowCell = { label: string; band: Band };

// Single-hue ramp reused from the app's existing neutral scale (the same
// steps as e.g. hover:bg-neutral-100 / dark:hover:bg-neutral-800 elsewhere).
// Dark mode inverts which end is "lit" but night stays the darkest/least-lit
// step in both themes, so the semantics ("dark = bad time to call") hold.
const BAND_CLASSES: Record<Band, string> = {
  working: "bg-white dark:bg-neutral-800",
  fringe: "bg-neutral-100 dark:bg-neutral-900",
  night: "bg-neutral-200 dark:bg-transparent",
};

export default function TimezoneRow({
  cityLabel,
  countryLabel,
  offsetLabel,
  isHome,
  cells,
  boundaryFraction,
  boundaryDateLabel,
  readoutTime,
  readoutDate,
  dayOffsetText,
  isSameDay,
  visible,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSetHome,
  canMoveUp,
  canMoveDown,
  canRemove,
}: {
  cityLabel: string;
  countryLabel: string;
  offsetLabel: string;
  isHome: boolean;
  cells: RowCell[];
  boundaryFraction: number | null;
  boundaryDateLabel: string;
  readoutTime: string;
  readoutDate: string;
  dayOffsetText: string;
  isSameDay: boolean;
  visible: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetHome: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
}) {
  return (
    <div
      className={clsx(
        "animate-fade-in flex w-max items-stretch gap-3 rounded-md transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2"
      )}
    >
      <div className="sticky left-0 z-10 flex w-32 shrink-0 flex-col justify-center gap-0.5 bg-[var(--background)] py-1 pr-2">
        <div className="flex items-center gap-1">
          {isHome ? (
            <IconHome size={12} className="shrink-0 text-neutral-400" />
          ) : (
            <button
              type="button"
              onClick={onSetHome}
              title="Set as home zone"
              aria-label="Set as home zone"
              className="shrink-0 text-neutral-300 hover:text-neutral-500 dark:text-neutral-700 dark:hover:text-neutral-400"
            >
              <IconHome size={12} />
            </button>
          )}
          <span title={`${cityLabel}, ${countryLabel}`} className="truncate text-sm font-medium">
            {cityLabel}
          </span>
        </div>
        <span className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{offsetLabel}</span>
        <div className="flex items-center gap-1 pt-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move zone up"
            className="text-neutral-400 hover:text-neutral-700 disabled:opacity-20 dark:hover:text-neutral-200"
          >
            <IconChevronUp size={13} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move zone down"
            className="text-neutral-400 hover:text-neutral-700 disabled:opacity-20 dark:hover:text-neutral-200"
          >
            <IconChevronDown size={13} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label="Remove zone"
            className="ml-auto text-neutral-400 hover:text-red-500 disabled:opacity-20"
          >
            <IconX size={13} />
          </button>
        </div>
      </div>

      <div className="relative flex shrink-0">
        {boundaryFraction !== null && (
          <div
            className="pointer-events-none absolute top-0 z-[1] h-full border-l-2 border-neutral-400 dark:border-neutral-600"
            style={{ left: `${boundaryFraction * 100}%` }}
          >
            <span className="absolute -top-4 left-1 whitespace-nowrap text-[9px] text-neutral-500 dark:text-neutral-400">
              {boundaryDateLabel}
            </span>
          </div>
        )}
        {cells.map((cell, i) => (
          <div
            key={i}
            title={cell.label}
            className={clsx(
              "flex h-10 w-9 shrink-0 items-center justify-center border-r border-neutral-100 text-[10px] font-mono text-neutral-600 transition-colors last:border-r-0 hover:bg-neutral-300 dark:border-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700",
              BAND_CLASSES[cell.band]
            )}
          >
            {cell.label}
          </div>
        ))}
      </div>

      <div className="sticky right-0 z-10 flex w-28 shrink-0 flex-col justify-center gap-0.5 bg-[var(--background)] py-1 pl-2 text-right">
        <span className="font-mono text-sm tabular-nums">{readoutTime}</span>
        <span className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{readoutDate}</span>
        <span
          className={clsx(
            "self-end rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            isSameDay
              ? "border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
              : "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
          )}
        >
          {dayOffsetText}
        </span>
      </div>
    </div>
  );
}
