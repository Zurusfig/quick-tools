import { redis } from "@/lib/redis";
import { requireApiKey } from "@/lib/auth";
import {
  RESERVED_SLUGS,
  SLUG_PATTERN,
  clicksKey,
  isValidUrl,
  linkKey,
  LINKS_INDEX,
  type LinkRecord,
} from "@/lib/links";
import { generateKey } from "@/lib/shortkey";

const MAX_ATTEMPTS = 5;
const LIST_LIMIT = 100;

export async function POST(request: Request) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  let body: { url?: unknown; slug?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const requestedSlug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!isValidUrl(url)) {
    return Response.json(
      { error: "Provide a valid http:// or https:// URL." },
      { status: 400 }
    );
  }

  if (requestedSlug) {
    if (!SLUG_PATTERN.test(requestedSlug)) {
      return Response.json(
        { error: "Slug must be 3-32 characters: lowercase letters, digits, hyphens." },
        { status: 400 }
      );
    }
    if (RESERVED_SLUGS.has(requestedSlug)) {
      return Response.json({ error: "That slug is reserved." }, { status: 400 });
    }
  }

  const record: LinkRecord = { url, createdAt: Date.now(), note };

  if (requestedSlug) {
    const created = await redis.set(linkKey(requestedSlug), record, { nx: true });
    if (!created) {
      return Response.json({ error: "That slug is already taken." }, { status: 409 });
    }
    await redis.zadd(LINKS_INDEX, { score: record.createdAt, member: requestedSlug });
    return Response.json({
      key: requestedSlug,
      shortUrl: buildShortUrl(request, requestedSlug),
    });
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const key = generateKey();
    const created = await redis.set(linkKey(key), record, { nx: true });
    if (created) {
      await redis.zadd(LINKS_INDEX, { score: record.createdAt, member: key });
      return Response.json({ key, shortUrl: buildShortUrl(request, key) });
    }
  }

  return Response.json({ error: "Could not generate a unique key, try again." }, { status: 500 });
}

export async function GET(request: Request) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  const keys = await redis.zrange<string[]>(LINKS_INDEX, 0, LIST_LIMIT - 1, { rev: true });
  if (keys.length === 0) return Response.json([]);

  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.get<LinkRecord>(linkKey(key));
    pipeline.get<number>(clicksKey(key));
  }
  const results = await pipeline.exec<(LinkRecord | number | null)[]>();

  const links = keys.map((key, i) => {
    const record = results[i * 2] as LinkRecord | null;
    const clicks = (results[i * 2 + 1] as number | null) ?? 0;
    return record
      ? { key, url: record.url, note: record.note, createdAt: record.createdAt, clicks }
      : null;
  });

  return Response.json(links.filter((link): link is NonNullable<typeof link> => link !== null));
}

function buildShortUrl(request: Request, key: string): string {
  const origin = process.env.NEXT_PUBLIC_SHORT_ORIGIN || `${new URL(request.url).origin}/s`;
  return `${origin.replace(/\/$/, "")}/${key}`;
}
