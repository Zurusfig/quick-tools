"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import Field, { ErrorText } from "@/components/Field";
import TextArea from "@/components/TextArea";
import CopyButton from "@/components/CopyButton";
import { usePersistedState, useDebounced } from "@/lib/hooks";

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    segment.length + ((4 - (segment.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function decodeJwt(token: string) {
  const parts = token.trim().split(".");
  if (parts.length < 2) throw new Error("Not a valid JWT (expected 3 dot-separated parts).");
  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  return { header, payload };
}

export default function JwtTool() {
  const [input, setInput] = usePersistedState("jwt:input", "");
  const debouncedInput = useDebounced(input);
  const [nowMs] = useState(() => Date.now());

  let header = "";
  let payload = "";
  let error = "";
  let expInfo = "";

  if (debouncedInput.trim()) {
    try {
      const decoded = decodeJwt(debouncedInput);
      header = JSON.stringify(decoded.header, null, 2);
      payload = JSON.stringify(decoded.payload, null, 2);
      const exp = decoded.payload?.exp;
      if (typeof exp === "number") {
        const date = new Date(exp * 1000);
        const expired = date.getTime() < nowMs;
        expInfo = `${date.toLocaleString()} — ${expired ? "expired" : "valid"}`;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not decode this token.";
    }
  }

  return (
    <ToolShell
      title="JWT Decoder"
      description="Decode a JWT's header and payload locally. Signature is not verified."
    >
      <Field label="Token">
        <TextArea rows={5} value={input} onChange={(e) => setInput(e.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>

      {expInfo && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <span className="font-medium">exp:</span> {expInfo}
        </p>
      )}

      <Field label="Header">
        <TextArea rows={5} value={header} readOnly />
      </Field>
      <CopyButton value={header} className="self-start" />

      <Field label="Payload">
        <TextArea rows={10} value={payload} readOnly />
      </Field>
      <CopyButton value={payload} className="self-start" />
    </ToolShell>
  );
}
