"use client";

import { useState } from "react";
import clsx from "clsx";
import { parseNonNegativeInt, parseNonNegativeNumber } from "@/lib/sushi";

export default function NumberField({
  value,
  onChange,
  kind = "int",
  stepper = false,
  min = 0,
  className,
  inputClassName,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  kind?: "int" | "decimal";
  stepper?: boolean;
  min?: number;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  const [error, setError] = useState("");

  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
    setError("");
  }

  function commit(raw: string) {
    setDraft(raw);
    const parsed = kind === "int" ? parseNonNegativeInt(raw) : parseNonNegativeNumber(raw);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setError("");
    onChange(Math.max(min, parsed.value));
  }

  function step(delta: number) {
    commit(String(Math.max(min, value + delta)));
  }

  return (
    <div className={clsx("relative", className)}>
      <div className="flex items-center gap-1">
        {stepper && (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Decrease"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            −
          </button>
        )}
        <input
          type="text"
          inputMode={kind === "int" ? "numeric" : "decimal"}
          value={draft}
          onChange={(e) => commit(e.target.value)}
          aria-label={ariaLabel}
          className={clsx(
            "h-10 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-center font-mono text-sm outline-none focus:border-neutral-500",
            error && "border-red-400 dark:border-red-500/60",
            inputClassName
          )}
        />
        {stepper && (
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Increase"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            +
          </button>
        )}
      </div>
      {/* Absolutely positioned so a validation error never shifts surrounding layout. */}
      {error && (
        <p className="animate-fade-in-fast absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded-md border border-red-200 bg-white px-1.5 py-0.5 text-[11px] text-red-500 shadow-sm dark:border-red-900 dark:bg-neutral-900">
          {error}
        </p>
      )}
    </div>
  );
}
