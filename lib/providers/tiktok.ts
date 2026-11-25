import { cached, HOUR } from "../cache";
import { cleanTag, safeUrl } from "../links";
import type { Creator, Post } from "../schema";

const API = "https://open.tiktokapis.com/v2";
const ck = () => process.env.TIKTOK_CLIENT_KEY;
const cs = () => process.env.TIKTOK_CLIENT_SECRET;
export const tiktokConfigured = () => !!(ck() && cs());

let tokenCache: { token: string; expires: number } | null = null;
async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expires > Date.now() + 60_000) return tokenCache.token;
  const r = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: ck()!, client_secret: cs()!, grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(8000),
  });
  const j = (await r.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!j.access_token) throw new Error(`TikTok token: ${j.error_description ?? r.status}`);
  tokenCache = { token: j.access_token, expires: Date.now() + (j.expires_in ?? 7200) * 1000 };
  return j.access_token;
}

async function research<T>(path: string, fields: string, body: unknown): Promise<T> {
  const r = await fetch(`${API}/research/${path}/?fields=${fields}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const j = (await r.json()) as { data?: T; error?: { code?: string; message?: string } };
  if (!r.ok || (j.error && j.error.code !== "ok")) throw new Error(`TikTok ${path}: ${j.error?.message ?? r.status}`);
  return j.data as T;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

type Video = { id: number | string; username?: string; video_description?: string; create_time?: number; like_count?: number; view_count?: number };

/** Popular recent videos for a hashtag (Research API allows ≤ 30-day windows). Covers come from public oEmbed. */
export async function searchTikTok(hashtag: string, query: string, limit = 8): Promise<Post[]> {
  if (!tiktokConfigured()) return [];
  const tag = cleanTag(hashtag);
  if (!tag) return [];
  return cached(`tt:${tag}:${limit}`, 6 * HOUR, async () => {
    const end = new Date();
    const start = new Date(end.getTime() - 29 * 24 * HOUR);
    const data = await research<{ videos?: Video[] }>("video/query", "id,username,video_description,create_time,like_count,view_count", {
      query: { and: [{ operation: "IN", field_name: "hashtag_name", field_values: [tag] }] },
      start_date: ymd(start), end_date: ymd(end), max_count: 50,
    });
    const top = (data.videos ?? [])
      .filter((v) => v.username)
      .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
      .slice(0, limit);
    return Promise.all(top.map(async (v): Promise<Post> => {
      const url = `https://www.tiktok.com/@${v.username}/video/${v.id}`;
      const oe = await oembed(url);
      return {
        id: `tt:${v.id}`, platform: "tiktok", kind: "video", url,
        thumbnail: oe?.thumbnail, title: v.video_description ?? oe?.title,
        author: v.username, authorUrl: `https://www.tiktok.com/@${v.username}`,
        publishedAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : undefined,
        likes: v.like_count, query,
      };
    }));
  });
}

async function oembed(url: string): Promise<{ thumbnail?: string; title?: string } | null> {
  try {
    const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { thumbnail_url?: string; title?: string };
    return { thumbnail: safeUrl(j.thumbnail_url), title: j.title };
  } catch {
    return null;
  }
}

export async function verifyTikTok(c: Creator): Promise<Creator> {
  if (!tiktokConfigured() || !c.handle) return c;
  return cached(`ttc:${c.handle}`, 24 * HOUR, async () => {
    try {
      const u = await research<{ display_name?: string; follower_count?: number; avatar_url?: string }>(
        "user/info", "display_name,follower_count,avatar_url", { username: c.handle },
      );
      if (!u?.display_name) return { ...c, verified: false };
      return { ...c, verified: true, followers: u.follower_count, avatar: safeUrl(u.avatar_url), url: `https://www.tiktok.com/@${c.handle}` };
    } catch {
      return c;
    }
  });
}
