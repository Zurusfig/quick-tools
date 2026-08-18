"use client";

import { useEffect, useState } from "react";
import ToolShell from "@/components/ToolShell";
import Field, { ErrorText } from "@/components/Field";
import Input from "@/components/Input";
import CopyButton from "@/components/CopyButton";
import { usePersistedState, useDebounced } from "@/lib/hooks";

export default function TimestampTool() {
  const [unix, setUnix] = usePersistedState("timestamp:unix", "");
  const [iso, setIso] = usePersistedState("timestamp:iso", "");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const debouncedUnix = useDebounced(unix);
  const debouncedIso = useDebounced(iso);

  let unixError = "";
  let isoError = "";
  let unixResultDate: Date | null = null;
  let isoResultUnix = "";
  let isoResultLocal = "";

  if (debouncedUnix.trim()) {
    const ms = Number(debouncedUnix) * (debouncedUnix.trim().length > 10 ? 1 : 1000);
    if (Number.isNaN(ms)) {
      unixError = "Not a valid number.";
    } else {
      unixResultDate = new Date(ms);
      if (Number.isNaN(unixResultDate.getTime())) {
        unixError = "Out of range.";
        unixResultDate = null;
      }
    }
  }

  if (debouncedIso.trim()) {
    const parsed = new Date(debouncedIso);
    if (Number.isNaN(parsed.getTime())) {
      isoError = "Not a valid date string.";
    } else {
      isoResultUnix = String(Math.floor(parsed.getTime() / 1000));
      isoResultLocal = parsed.toLocaleString();
    }
  }

  return (
    <ToolShell
      title="Timestamp Converter"
      description="Convert between Unix time, ISO 8601, and local time."
    >
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Now: <span className="font-mono">{now}</span> ·{" "}
        <span className="font-mono">{new Date(now * 1000).toISOString()}</span>
      </p>

      <Field label="Unix timestamp (seconds or milliseconds)">
        <Input value={unix} onChange={(e) => setUnix(e.target.value)} placeholder="1700000000" />
      </Field>
      <ErrorText>{unixError}</ErrorText>
      {unixResultDate && (
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm">
            {unixResultDate.toISOString()} · {unixResultDate.toLocaleString()}
          </p>
          <CopyButton value={unixResultDate.toISOString()} />
        </div>
      )}

      <Field label="ISO 8601 / date string">
        <Input value={iso} onChange={(e) => setIso(e.target.value)} placeholder="2023-11-14T22:13:20.000Z" />
      </Field>
      <ErrorText>{isoError}</ErrorText>
      {isoResultUnix && (
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm">
            {isoResultUnix} · {isoResultLocal}
          </p>
          <CopyButton value={isoResultUnix} />
        </div>
      )}
    </ToolShell>
  );
}
