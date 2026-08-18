"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { tools } from "@/lib/tools";
import Input from "@/components/Input";

export default function Home() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter((tool) => {
      const haystack = `${tool.name} ${tool.description} ${tool.keywords.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter tools..."
        className="mb-6 max-w-sm"
        autoFocus
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((tool, index) => (
          <Link
            key={tool.slug}
            href={`/t/${tool.slug}`}
            style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            className="animate-fade-in group flex flex-col gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-md dark:hover:border-neutral-600 dark:hover:shadow-neutral-900"
          >
            <div className="flex items-center gap-2">
              <tool.icon size={18} className="text-neutral-500 transition-transform group-hover:scale-110" />
              <span className="font-medium text-sm">{tool.name}</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {tool.description}
            </p>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-sm text-neutral-500">No tools match.</p>
        )}
      </div>
    </div>
  );
}
