import { z } from "zod";
import { findProduct, shoppingConfigured } from "@/lib/providers/shopping";
import { limited } from "@/lib/ratelimit";
import type { Product } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ queries: z.array(z.string().min(2).max(120)).max(16) });

/** One product photo per outfit-piece query; unknown or failed queries are simply left out. */
export async function POST(req: Request) {
  if (limited(req, 6)) return Response.json({ error: "请求太频繁，请一分钟后再试。" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请求格式不对。" }, { status: 400 });
  if (!shoppingConfigured()) return Response.json({ configured: false, products: {} });

  const queries = [...new Set(parsed.data.queries)];
  const products: Record<string, Product> = {};
  const results = await Promise.allSettled(queries.map((q) => findProduct(q)));
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) products[queries[i]] = r.value;
    else if (r.status === "rejected") console.error("product search failed", queries[i], r.reason);
  });
  return Response.json({ configured: true, products });
}
