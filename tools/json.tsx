"use client";

import ToolShell from "@/components/ToolShell";
import Field, { ErrorText } from "@/components/Field";
import TextArea from "@/components/TextArea";
import CopyButton from "@/components/CopyButton";
import { usePersistedState, useDebounced } from "@/lib/hooks";

function locateError(input: string, message: string): string {
  const match = message.match(/position (\d+)/);
  if (!match) return message;
  const position = Number(match[1]);
  const before = input.slice(0, position);
  const line = before.split("\n").length;
  const column = position - before.lastIndexOf("\n");
  return `${message} (line ${line}, column ${column})`;
}

export default function JsonTool() {
  const [input, setInput] = usePersistedState("json:input", "");
  const debouncedInput = useDebounced(input);

  let formatted = "";
  let error = "";

  if (debouncedInput.trim()) {
    try {
      const parsed = JSON.parse(debouncedInput);
      formatted = JSON.stringify(parsed, null, 2);
    } catch (err) {
      error = locateError(debouncedInput, err instanceof Error ? err.message : "Invalid JSON.");
    }
  }

  function minify() {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
    } catch {
      // leave input untouched, error already shown
    }
  }

  function format() {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, 2));
    } catch {
      // leave input untouched, error already shown
    }
  }

  return (
    <ToolShell
      title="JSON Formatter"
      description="Format, minify, and validate JSON. Errors show line and column."
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={format}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Format
        </button>
        <button
          type="button"
          onClick={minify}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Minify
        </button>
      </div>

      <Field label="Input">
        <TextArea rows={10} value={input} onChange={(e) => setInput(e.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>

      {!error && formatted && (
        <>
          <Field label="Formatted">
            <TextArea rows={10} value={formatted} readOnly />
          </Field>
          <CopyButton value={formatted} className="self-start" />
        </>
      )}
    </ToolShell>
  );
}
