"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tools } from "@/lib/tools";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function go(slug: string) {
    setOpen(false);
    router.push(`/t/${slug}`);
  }

  return (
    <>
      <button
        type="button"
        id="command-palette-trigger"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        Search tools
        <kbd className="rounded border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="Command palette" shouldFilter>
              <Command.Input
                autoFocus
                placeholder="Find a tool..."
                className="w-full border-b border-neutral-200 dark:border-neutral-800 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
              />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-2 py-6 text-center text-sm text-neutral-500">
                  No tools found.
                </Command.Empty>
                {tools.map((tool) => (
                  <Command.Item
                    key={tool.slug}
                    value={`${tool.name} ${tool.keywords.join(" ")}`}
                    onSelect={() => go(tool.slug)}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-neutral-100 dark:data-[selected=true]:bg-neutral-800"
                  >
                    <tool.icon size={16} className="shrink-0 text-neutral-500" />
                    <div>
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-xs text-neutral-500">{tool.description}</div>
                    </div>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
