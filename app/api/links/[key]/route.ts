import { redis } from "@/lib/redis";
import { requireApiKey } from "@/lib/auth";
import { clicksKey, linkKey, LINKS_INDEX } from "@/lib/links";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  const { key } = await params;

  await Promise.all([
    redis.del(linkKey(key)),
    redis.del(clicksKey(key)),
    redis.zrem(LINKS_INDEX, key),
  ]);

  return Response.json({ ok: true });
}
