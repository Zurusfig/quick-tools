"use client";

import ToolShell from "@/components/ToolShell";
import Field, { ErrorText } from "@/components/Field";
import TextArea from "@/components/TextArea";
import CopyButton from "@/components/CopyButton";
import { usePersistedState, useDebounced } from "@/lib/hooks";

export default function UrlTool() {
  const [encodeInput, setEncodeInput] = usePersistedState("url:encode", "");
  const [decodeInput, setDecodeInput] = usePersistedState("url:decode", "");
  const [queryInput, setQueryInput] = usePersistedState("url:query", "");

  const debouncedEncode = useDebounced(encodeInput);
  const debouncedDecode = useDebounced(decodeInput);
  const debouncedQuery = useDebounced(queryInput);

  let encoded = "";
  try {
    encoded = debouncedEncode ? encodeURIComponent(debouncedEncode) : "";
  } catch {
    // encodeURIComponent rarely throws; leave blank
  }

  let decoded = "";
  let decodeError = "";
  try {
    decoded = debouncedDecode ? decodeURIComponent(debouncedDecode) : "";
  } catch {
    decodeError = "Invalid percent-encoding.";
  }

  let params: [string, string][] = [];
  let queryError = "";
  try {
    if (debouncedQuery.trim()) {
      const withoutPrefix = debouncedQuery.replace(/^[?#]/, "");
      params = Array.from(new URLSearchParams(withoutPrefix).entries());
    }
  } catch {
    queryError = "Could not parse query string.";
  }

  return (
    <ToolShell
      title="URL Encoder & Query Parser"
      description="Encode/decode URI components and inspect query strings."
    >
      <Field label="Encode: plain text">
        <TextArea rows={3} value={encodeInput} onChange={(e) => setEncodeInput(e.target.value)} />
      </Field>
      <div className="flex items-center gap-2">
        <TextArea rows={3} value={encoded} readOnly />
        <CopyButton value={encoded} />
      </div>

      <Field label="Decode: encoded text">
        <TextArea rows={3} value={decodeInput} onChange={(e) => setDecodeInput(e.target.value)} />
      </Field>
      <ErrorText>{decodeError}</ErrorText>
      <div className="flex items-center gap-2">
        <TextArea rows={3} value={decoded} readOnly />
        <CopyButton value={decoded} />
      </div>

      <Field label="Query string">
        <TextArea rows={2} value={queryInput} onChange={(e) => setQueryInput(e.target.value)} />
      </Field>
      <ErrorText>{queryError}</ErrorText>

      {params.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {params.map(([key, value], i) => (
                <tr key={`${key}-${i}`} className="border-b border-neutral-100 dark:border-neutral-900 last:border-0">
                  <td className="px-3 py-2">{key}</td>
                  <td className="px-3 py-2 break-all">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ToolShell>
  );
}
