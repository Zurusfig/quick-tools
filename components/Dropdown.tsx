"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { IconChevronDown, IconCheck } from "@tabler/icons-react";

export type DropdownOption = { value: string; label: string };

export default function Dropdown({
  value,
  options,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm outline-none focus:border-neutral-500"
      >
        <span className="truncate">{selected?.label ?? "Select…"}</span>
        <IconChevronDown
          size={14}
          className={clsx("shrink-0 text-neutral-400 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="animate-scale-in absolute z-20 mt-1 max-h-60 w-full min-w-max overflow-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1 shadow-lg"
        >
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={clsx(
                "flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800",
                option.value === value && "font-medium"
              )}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <IconCheck size={14} className="shrink-0 text-neutral-500" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
