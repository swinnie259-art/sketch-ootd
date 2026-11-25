import type { Platform } from "./schema";

const enc = encodeURIComponent;

/** Platform search pages — used as a fallback when an API isn't configured, and as "see more". */
export function searchLinks(query: string, hashtag?: string): [label: string, url: string][] {
  const tag = cleanTag(hashtag || query);
  return [
    ["Instagram", tag ? `https://www.instagram.com/explore/tags/${enc(tag)}/` : `https://www.instagram.com/explore/search/keyword/?q=${enc(query)}`],
    ["TikTok", `https://www.tiktok.com/search?q=${enc(query)}`],
    ["YouTube", `https://www.youtube.com/results?search_query=${enc(query)}`],
    ["小红书", `https://www.xiaohongshu.com/search_result?keyword=${enc(query)}`],
  ];
}

export function cleanTag(s: string) {
  return s.replace(/^#/, "").replace(/[^\p{L}\p{N}_]/gu, "").toLowerCase();
}

export function cleanHandle(s: string) {
  return s.replace(/^@/, "").replace(/[^A-Za-z0-9._-]/g, "");
}

export function profileUrl(platform: Platform, handle: string): string | undefined {
  const h = cleanHandle(handle);
  if (!h) return undefined;
  if (platform === "instagram") return `https://www.instagram.com/${h}/`;
  if (platform === "tiktok") return `https://www.tiktok.com/@${h}`;
  return `https://www.youtube.com/@${h}`;
}

export function shopLink(q: string) {
  return `https://www.google.com/search?tbm=shop&q=${enc(q)}`;
}

/** Only let https links from API data reach the page. */
export function safeUrl(u: unknown): string | undefined {
  return typeof u === "string" && u.startsWith("https://") ? u : undefined;
}
