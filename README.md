# Quick Tools

A single-page collection of small client-side utilities: QR generator, Base64, JWT decoder, JSON formatter, UUID generator, timestamp converter, hash generator, and URL encoder/query parser. Everything runs in the browser — no backend, no network calls. The one exception is the [link shortener](#link-shortener), which is backed by Redis.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Adding a tool

Adding a new tool is a two-step, one-file-plus-one-line operation:

1. **Create `tools/<slug>.tsx`** — a default-exported client component. Keep it self-contained (no imports from other tools), use the shared primitives in `components/` (`ToolShell`, `Field`, `Input`, `TextArea`, `Select`, `CopyButton`), and persist input with `usePersistedState` from `lib/hooks`.

   ```tsx
   "use client";

   import ToolShell from "@/components/ToolShell";
   import Field from "@/components/Field";
   import TextArea from "@/components/TextArea";
   import { usePersistedState } from "@/lib/hooks";

   export default function MyTool() {
     const [input, setInput] = usePersistedState("my-tool:input", "");
     return (
       <ToolShell title="My Tool" description="What it does.">
         <Field label="Input">
           <TextArea value={input} onChange={(e) => setInput(e.target.value)} />
         </Field>
       </ToolShell>
     );
   }
   ```

2. **Add one entry to the registry in `lib/tools.ts`**:

   ```ts
   {
     slug: "my-tool",
     name: "My Tool",
     description: "What it does.",
     keywords: ["relevant", "search", "terms"],
     icon: IconSomething, // from @tabler/icons-react
     load: () => import("@/tools/my-tool"),
   },
   ```

That's it — the tool automatically appears in the home grid, the command palette (Cmd/Ctrl+K), and gets its own static route at `/t/my-tool`.

## Architecture

- `lib/tools.ts` — the tool registry (single source of truth).
- `app/t/[slug]/page.tsx` — resolves a slug and lazy-loads the matching component via `ToolLoader`.
- `app/page.tsx` — searchable grid of tool cards.
- `components/CommandPalette.tsx` — Cmd/Ctrl+K fuzzy search over tool name + keywords.
- `components/` — dumb shared UI primitives (`ToolShell`, `Input`, `TextArea`, `Select`, `CopyButton`, `Field`).
- `tools/*.tsx` — one file per tool, fully self-contained.
- `app/api/links/`, `app/s/[key]/route.ts`, `middleware.ts`, `lib/redis.ts`, `lib/auth.ts`, `lib/links.ts`, `lib/shortkey.ts` — the link shortener's server side, see [Link shortener](#link-shortener) below.

## Notes

- Dark mode is the default and respects `prefers-color-scheme`; toggle it in the header.
- Each tool persists its last input to `localStorage` and restores it on mount.
- A minimal service worker (`public/sw.js`) caches the app shell for offline use in production builds.
- Scaffolded with the current `create-next-app` defaults (Next.js 16, Tailwind v4) rather than pinned to Next 14 — App Router structure and APIs used here are unaffected by that version bump.

## Link shortener

The `shorten` tool and its API routes (`app/api/links/`, `app/s/[key]/route.ts`) create short links stored in [Upstash Redis](https://upstash.com/).

### Environment variables

Set these in `.env.local` (already gitignored — never commit real values):

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | REST URL of your Upstash Redis database. |
| `UPSTASH_REDIS_REST_TOKEN` | REST token for that database. |
| `SHORTENER_SECRET` | Shared secret required as the `x-api-key` header on every `/api/links` request. Generate something long and random — this is the only thing standing between the internet and your Redis-backed link list. |
| `NEXT_PUBLIC_SHORT_ORIGIN` | The public origin short links are displayed/built with, e.g. `https://z.zagif.com`. Exposed to the browser (hence `NEXT_PUBLIC_`). Falls back to `<current origin>/s` if unset. |

Set the same four variables in your Vercel project settings (Production, and Preview if you want short links to work there too).

### DNS: z.zagif.com

Short links live at `https://z.zagif.com/<key>` with no `/s/` segment — `middleware.ts` rewrites any request whose `Host` starts with `z.` to `/s/<key>` internally, and redirects the bare root (`z.zagif.com/`) to `https://tools.zagif.com`.

To wire this up on Vercel:

1. Add `z.zagif.com` as a domain on the **same Vercel project** as `tools.zagif.com` (Project Settings → Domains). Don't create a separate project — the middleware needs to see both hostnames hit the same deployment.
2. In your DNS provider, add a `CNAME` record for `z` pointing at `cname.vercel-dns.com` (Vercel will show the exact target when you add the domain).
3. Once DNS propagates, `https://z.zagif.com/<key>` resolves through the middleware rewrite to the redirect route, and `https://z.zagif.com/` bounces to `https://tools.zagif.com`.

### Using it

1. Open the **Link Shortener** tool (`/t/shorten`) and paste your `SHORTENER_SECRET` into the API key field — it's stored in `localStorage` under `shortener-secret`, never sent anywhere except the `x-api-key` header on your own `/api/links` requests.
2. Enter a URL, optionally a custom slug and a note, and hit Create.
3. The table below lists existing links newest-first, with click counts, copy buttons, and a two-step delete.

## Deploy

Deploy target is Vercel — push to a Git repo and import the project at [vercel.com/new](https://vercel.com/new).
