# Quick Tools

A single-page collection of small client-side utilities: QR generator, Base64, JWT decoder, JSON formatter, UUID generator, timestamp converter, hash generator, and URL encoder/query parser. Everything runs in the browser — no backend, no network calls.

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

## Notes

- Dark mode is the default and respects `prefers-color-scheme`; toggle it in the header.
- Each tool persists its last input to `localStorage` and restores it on mount.
- A minimal service worker (`public/sw.js`) caches the app shell for offline use in production builds.
- Scaffolded with the current `create-next-app` defaults (Next.js 16, Tailwind v4) rather than pinned to Next 14 — App Router structure and APIs used here are unaffected by that version bump.

## Deploy

Deploy target is Vercel — push to a Git repo and import the project at [vercel.com/new](https://vercel.com/new).
