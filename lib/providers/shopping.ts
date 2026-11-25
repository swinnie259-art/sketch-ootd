import { cached, HOUR } from "../cache";
import { safeUrl } from "../links";
import type { Product } from "../schema";

/**
 * Product photos for outfit pieces, from Google Shopping results via SerpApi
 * (https://serpapi.com/google-shopping-api). Shopping thumbnails are mostly
 * cut-out product shots on white, which is what the collage needs.
 */
const key = () => process.env.SERPAPI_KEY;
export const shoppingConfigured = () => !!key();

type Result = {
  title?: string; price?: string; source?: string; thumbnail?: string;
  product_link?: string; link?: string;
};

export async function findProduct(query: string): Promise<Product | null> {
  if (!shoppingConfigured()) return null;
  return cached(`shop:${query.toLowerCase()}`, 24 * HOUR, async () => {
    const qs = new URLSearchParams({
      engine: "google_shopping", q: query, num: "10",
      gl: process.env.SHOPPING_COUNTRY || "us", hl: "en", api_key: key()!,
    });
    const r = await fetch(`https://serpapi.com/search.json?${qs}`, { signal: AbortSignal.timeout(12000) });
    const j = (await r.json()) as { shopping_results?: Result[]; error?: string };
    if (!r.ok || j.error) throw new Error(`Shopping search: ${j.error ?? r.status}`);
    const hit = (j.shopping_results ?? []).find((x) => safeUrl(x.thumbnail));
    if (!hit) return null;
    return {
      image: safeUrl(hit.thumbnail)!, title: hit.title, price: hit.price, source: hit.source,
      link: safeUrl(hit.product_link) ?? safeUrl(hit.link),
    };
  });
}
