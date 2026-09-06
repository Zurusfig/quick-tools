"use client";

import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import { ZONES, type ZoneInfo } from "@/lib/timezone";

export default function ZoneCombobox({ existing, onAdd }: { existing: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const available = ZONES.filter((z) => !existing.includes(z.id));

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function pick(zone: ZoneInfo) {
    onAdd(zone.id);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-500 dark:text-neutral-400 outline-none focus:border-neutral-500 sm:w-64"
      >
        <IconSearch size={14} className="shrink-0" />
        <span className="truncate">Add a zone…</span>
      </button>
      {open && (
        <div className="animate-scale-in absolute z-20 mt-1 w-full min-w-64 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <Command label="Add time zone" shouldFilter>
            <Command.Input
              autoFocus
              placeholder="City, country, zone id, or abbreviation…"
              className="w-full border-b border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-neutral-400"
            />
            <Command.List className="max-h-64 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-neutral-500">No zones match.</Command.Empty>
              {available.map((zone) => (
                <Command.Item
                  key={zone.id}
                  value={`${zone.city} ${zone.country} ${zone.id} ${zone.abbrs.join(" ")}`}
                  onSelect={() => pick(zone)}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors data-[selected=true]:bg-neutral-100 dark:data-[selected=true]:bg-neutral-800"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{zone.city}</span>{" "}
                    <span className="text-neutral-500">{zone.country}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-neutral-400">{zone.abbrs[0] ?? ""}</span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  );
}
