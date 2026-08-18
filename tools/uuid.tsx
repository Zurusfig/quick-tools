"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Field from "@/components/Field";
import TextArea from "@/components/TextArea";
import Input from "@/components/Input";
import CopyButton from "@/components/CopyButton";

export default function UuidTool() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>(() =>
    Array.from({ length: 5 }, () => crypto.randomUUID())
  );

  function generate() {
    const clamped = Math.min(100, Math.max(1, count));
    setUuids(Array.from({ length: clamped }, () => crypto.randomUUID()));
  }

  const joined = uuids.join("\n");

  return (
    <ToolShell title="UUID Generator" description="Generate v4 UUIDs, one to a hundred at a time.">
      <div className="flex items-end gap-3">
        <Field label="Count">
          <Input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24"
          />
        </Field>
        <button
          type="button"
          onClick={generate}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Generate
        </button>
      </div>

      <Field label="UUIDs">
        <TextArea rows={Math.min(20, uuids.length + 1)} value={joined} readOnly />
      </Field>
      <CopyButton value={joined} className="self-start" />
    </ToolShell>
  );
}
