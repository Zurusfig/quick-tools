"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle() {
  // Always starts "dark" to match the server-rendered <html> default (see
  // layout.tsx's suppressHydrationWarning) — hydration requires the first
  // client render to equal the server's, so the real preference (which needs
  // localStorage/matchMedia, unavailable during SSR) is only read after
  // mount, in the effect below.
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("quick-tools:theme") as Theme | null;
    const preferred = stored ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    applyTheme(preferred);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with browser-only APIs unavailable during SSR
    setTheme(preferred);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem("quick-tools:theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-90"
    >
      <span key={theme} className="animate-pop-in inline-flex">
        {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
      </span>
    </button>
  );
}
