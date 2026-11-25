import { z } from "zod";
import { rerankPosts } from "@/lib/claude";
import { findPosts } from "@/lib/providers";
import { limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  item: z.string().max(400),
  searches: z.array(z.object({ label: z.string().max(80), query: z.string().max(120), hashtag: z.string().max(60) })).max(4),
});

const MAX_RERANK = 18;
const MIN_SCORE = 5;

export async function POST(req: Request) {
  if (limited(req, 6)) return Response.json({ error: "请求太频繁，请一分钟后再试。" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请求格式不对。" }, { status: 400 });

  const { posts, status } = await findPosts(parsed.data.searches);

  // Interleave platforms so re-ranking sees a mix, then let Claude look at the thumbnails.
  const byPlat = ["instagram", "tiktok", "youtube"].map((p) => posts.filter((x) => x.platform === p));
  const mixed = [];
  for (let i = 0; mixed.length < MAX_RERANK && byPlat.some((l) => l[i]); i++)
    for (const l of byPlat) if (l[i] && mixed.length < MAX_RERANK) mixed.push(l[i]);

  let ranked = mixed;
  let reranked = false;
  try {
    ranked = (await rerankPosts(parsed.data.item, mixed)).filter((p) => (p.score ?? 0) >= MIN_SCORE);
    reranked = true;
  } catch (e) {
    console.error("rerank failed; returning unranked posts", e);
  }
  return Response.json({ posts: ranked, status, reranked });
}
