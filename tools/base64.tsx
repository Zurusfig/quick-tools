"use client";

import { useRef, useState } from "react";
import ToolShell from "@/components/ToolShell";
import Field, { ErrorText } from "@/components/Field";
import TextArea from "@/components/TextArea";
import CopyButton from "@/components/CopyButton";
import { usePersistedState, useDebounced } from "@/lib/hooks";

type Direction = "encode" | "decode";

function encodeUtf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

function decodeBase64ToUtf8(input: string): string {
  const binary = atob(input);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export default function Base64Tool() {
  const [input, setInput] = usePersistedState("base64:input", "");
  const [direction, setDirection] = usePersistedState("base64:direction", "encode");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedInput = useDebounced(input);

  let output = "";
  let error = "";
  try {
    if (debouncedInput) {
      output =
        direction === "encode"
          ? encodeUtf8ToBase64(debouncedInput)
          : decodeBase64ToUtf8(debouncedInput.trim());
    }
  } catch {
    error =
      direction === "encode"
        ? "Could not encode this input."
        : "Invalid Base64 input.";
  }

  function toggleDirection() {
    setDirection(direction === "encode" ? "decode" : "encode");
    setInput(output);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      setDirection("decode" as Direction);
      setInput(base64);
    };
    reader.readAsDataURL(file);
  }

  return (
    <ToolShell
      title="Base64 Encode/Decode"
      description="Encode or decode Base64 text. UTF-8 safe, supports file input."
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleDirection}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          {direction === "encode" ? "Encode →" : "Decode →"} (swap)
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Choose file
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
        {fileName && <span className="text-xs text-neutral-500">{fileName}</span>}
      </div>

      <Field label={direction === "encode" ? "Text" : "Base64"}>
        <TextArea rows={6} value={input} onChange={(e) => setInput(e.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>

      <Field label={direction === "encode" ? "Base64" : "Text"}>
        <TextArea rows={6} value={output} readOnly />
      </Field>
      <CopyButton value={output} className="self-start" />
    </ToolShell>
  );
}
