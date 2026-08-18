import { after } from "next/server";
import { redis } from "@/lib/redis";
import { clicksKey, linkKey, type LinkRecord } from "@/lib/links";

export const runtime = "edge";

const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Link not found</title>
<style>
  body { background: #0a0a0a; color: #ededed; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  main { text-align: center; }
  a { color: #818cf8; }
</style>
</head>
<body>
  <main>
    <h1>Link not found</h1>
    <p>This short link doesn't exist or was removed.</p>
    <p><a href="https://tools.zagif.com">tools.zagif.com</a></p>
  </main>
</body>
</html>`;

function notFound(): Response {
  return new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const record = await redis.get<LinkRecord>(linkKey(key));

  if (!record) return notFound();

  after(() => redis.incr(clicksKey(key)));

  return new Response(null, {
    status: 302,
    headers: { Location: record.url, "cache-control": "no-store" },
  });
}
