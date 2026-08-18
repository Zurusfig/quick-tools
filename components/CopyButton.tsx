"use client";

import { useState } from "react";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import clsx from "clsx";

export default function CopyButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95",
        className
      )}
    >
      {copied ? (
        <span key="copied" className="animate-pop-in inline-flex items-center gap-1.5">
          <IconCheck size={14} className="text-green-500" /> Copied
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <IconCopy size={14} /> Copy
        </span>
      )}
    </button>
  );
}
