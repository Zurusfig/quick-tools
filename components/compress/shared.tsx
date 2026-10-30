"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { IconUpload } from "@tabler/icons-react";
import { PRESETS, formatBytes, percentSaved, type PresetId } from "@/lib/compress";

export const buttonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 active:scale-95";
export const primaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 px-3 py-2 text-xs font-medium text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50 active:scale-95";

export function FileDropzone({
  accept,
  label,
  hint,
  onFile,
}: {
  accept: string;
  label: string;
  hint: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={clsx(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center",
        dragging
          ? "border-neutral-500 bg-neutral-100 dark:bg-neutral-800"
          : "border-neutral-300 dark:border-neutral-700"
      )}
    >
      <IconUpload size={24} className="text-neutral-500" />
      <button type="button" onClick={() => inputRef.current?.click()} className={buttonClass}>
        {label}
      </button>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function PresetPicker({
  value,
  onChange,
}: {
  value: PresetId;
  onChange: (id: PresetId) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Compression preset" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={value === p.id}
          onClick={() => onChange(p.id)}
          className={clsx(
            "rounded-md border px-3 py-2 text-left",
            value === p.id
              ? "border-neutral-900 bg-neutral-100 dark:border-neutral-100 dark:bg-neutral-800"
              : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          )}
        >
          <span className="block text-sm font-medium">{p.label}</span>
          <span className="block text-xs text-neutral-500 dark:text-neutral-400">{p.hint}</span>
        </button>
      ))}
    </div>
  );
}

export function SizeStats({ original, compressed }: { original: number; compressed: number }) {
  const saved = percentSaved(original, compressed);
  const grew = compressed >= original;
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <Stat label="Original" value={formatBytes(original)} />
      <Stat label="Compressed" value={formatBytes(compressed)} />
      <Stat
        label={grew ? "Change" : "Saved"}
        value={grew ? `+${Math.abs(saved)}%` : `${saved}%`}
        tone={grew ? "bad" : "good"}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800 px-2 py-2">
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div>
      <div
        className={clsx(
          "font-mono text-sm font-medium",
          tone === "good" && "text-green-600 dark:text-green-500",
          tone === "bad" && "text-amber-600 dark:text-amber-500"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function LargerNotice({ kind }: { kind: "image" | "PDF" }) {
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      The compressed {kind} is not smaller than the original. This file is probably already well optimized.
      Download the original instead, or try the Smaller File preset.
    </p>
  );
}
