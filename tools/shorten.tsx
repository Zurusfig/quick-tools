"use client";

import { useEffect, useState } from "react";
import ToolShell from "@/components/ToolShell";
import Field, { ErrorText } from "@/components/Field";
import Input from "@/components/Input";
import CopyButton from "@/components/CopyButton";

type LinkRow = {
  key: string;
  url: string;
  note: string;
  createdAt: number;
  clicks: number;
};

const SECRET_STORAGE_KEY = "shortener-secret";
const buttonClass =
  "rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed";

function shortOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SHORT_ORIGIN;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/s`;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(ms).toLocaleDateString();
}

function readInitialSecret(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SECRET_STORAGE_KEY) ?? "";
}

export default function ShortenTool() {
  const [secret, setSecret] = useState(readInitialSecret);
  const [secretInput, setSecretInput] = useState("");

  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [lastShortUrl, setLastShortUrl] = useState("");

  const [links, setLinks] = useState<LinkRow[]>([]);
  const [listError, setListError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmKey, setConfirmKey] = useState("");

  useEffect(() => {
    if (secret) loadLinks(secret);
  }, [secret]);

  async function loadLinks(key: string) {
    setLoading(true);
    setListError("");
    try {
      const res = await fetch("/api/links", { headers: { "x-api-key": key } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load links.");
      setLinks(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not load links.");
    } finally {
      setLoading(false);
    }
  }

  function saveSecret() {
    const trimmed = secretInput.trim();
    window.localStorage.setItem(SECRET_STORAGE_KEY, trimmed);
    setSecret(trimmed);
    setSecretInput("");
  }

  function clearSecret() {
    window.localStorage.removeItem(SECRET_STORAGE_KEY);
    setSecret("");
    setLinks([]);
  }

  async function createLink() {
    setCreateError("");
    setLastShortUrl("");
    setCreating(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": secret },
        body: JSON.stringify({ url, slug: slug || undefined, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create link.");
      setLastShortUrl(data.shortUrl);
      setUrl("");
      setSlug("");
      setNote("");
      loadLinks(secret);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create link.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteLink(key: string) {
    try {
      const res = await fetch(`/api/links/${key}`, {
        method: "DELETE",
        headers: { "x-api-key": secret },
      });
      if (!res.ok) throw new Error("Could not delete link.");
      setLinks((prev) => prev.filter((link) => link.key !== key));
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not delete link.");
    } finally {
      setConfirmKey("");
    }
  }

  return (
    <ToolShell title="Link Shortener" description="Create short links backed by Upstash Redis.">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-800 p-3 text-xs">
        <span className="font-medium text-neutral-500 dark:text-neutral-400">API key</span>
        {secret ? (
          <>
            <span className="font-mono text-neutral-500">{"•".repeat(8)}</span>
            <button type="button" onClick={clearSecret} className={buttonClass}>
              Clear
            </button>
          </>
        ) : (
          <>
            <Input
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="Paste your SHORTENER_SECRET"
              className="max-w-xs"
            />
            <button type="button" onClick={saveSecret} className={buttonClass} disabled={!secretInput.trim()}>
              Save
            </button>
          </>
        )}
      </div>

      {!secret ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Set your API key above to create and manage short links.
        </p>
      ) : (
        <>
          <Field label="URL to shorten">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/very/long/path" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Custom slug (optional)">
              <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="my-link" />
            </Field>
            <Field label="Note (optional)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What this link is for" />
            </Field>
          </div>
          <button type="button" onClick={createLink} disabled={creating || !url.trim()} className={buttonClass}>
            {creating ? "Creating…" : "Create"}
          </button>
          <ErrorText>{createError}</ErrorText>

          {lastShortUrl && (
            <div className="flex items-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
              <span className="font-mono text-sm">{lastShortUrl}</span>
              <CopyButton value={lastShortUrl} />
            </div>
          )}

          <ErrorText>{listError}</ErrorText>
          {loading && <p className="text-sm text-neutral-500">Loading links…</p>}

          {links.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Key</th>
                    <th className="px-3 py-2 font-medium">Target</th>
                    <th className="px-3 py-2 font-medium">Note</th>
                    <th className="px-3 py-2 font-medium">Clicks</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {links.map((link) => (
                    <tr key={link.key} className="border-b border-neutral-100 dark:border-neutral-900 last:border-0">
                      <td className="px-3 py-2">{link.key}</td>
                      <td className="max-w-xs truncate px-3 py-2" title={link.url}>
                        {link.url}
                      </td>
                      <td className="px-3 py-2">{link.note}</td>
                      <td className="px-3 py-2">{link.clicks}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{relativeTime(link.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <CopyButton value={`${shortOrigin()}/${link.key}`} />
                          {confirmKey === link.key ? (
                            <>
                              <button
                                type="button"
                                onClick={() => deleteLink(link.key)}
                                className="shrink-0 rounded-md border border-red-400/50 px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmKey("")}
                                className="shrink-0 rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmKey(link.key)}
                              className="shrink-0 rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </ToolShell>
  );
}
