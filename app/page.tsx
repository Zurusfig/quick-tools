"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { tools, getCategories } from "@/lib/tools";
import Input from "@/components/Input";

const categories = getCategories();
const PILL_BASE = "rounded-full border px-3 py-1 text-xs font-medium transition-colors";
const PILL_ACTIVE =
  "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900";
const PILL_INACTIVE =
  "border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800";

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((tool) => {
      if (category && tool.category !== category) return false;
      if (!q) return true;
      const haystack = `${tool.name} ${tool.description} ${tool.keywords.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter tools..."
        className="mb-4 max-w-sm"
        autoFocus
      />
      <div className="mb-6 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={clsx(PILL_BASE, category === null ? PILL_ACTIVE : PILL_INACTIVE)}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory((prev) => (prev === cat ? null : cat))}
            className={clsx(PILL_BASE, category === cat ? PILL_ACTIVE : PILL_INACTIVE)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((tool, index) => (
          <Link
            key={tool.slug}
            href={`/t/${tool.slug}`}
            style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            className={clsx(
              "animate-fade-in group flex flex-col gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-md dark:hover:border-neutral-600 dark:hover:shadow-neutral-900",
              tool.slug === "sushi" && "tool-card-shine relative overflow-hidden"
            )}
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
