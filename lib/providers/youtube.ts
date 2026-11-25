import { cached, HOUR } from "../cache";
import { safeUrl } from "../links";
import type { Creator, Post } from "../schema";

const API = "https://www.googleapis.com/youtube/v3";
const key = () => process.env.YOUTUBE_API_KEY;
export const youtubeConfigured = () => !!key();

type SearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string; channelTitle?: string; channelId?: string; publishedAt?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
};

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: key()! });
  const r = await fetch(`${API}/${path}?${qs}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`YouTube ${path} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json() as Promise<T>;
}

/** Videos (incl. Shorts) for an OOTD query. Each search.list call costs 100 quota units, so results are cached. */
export async function searchYouTube(query: string, limit = 6): Promise<Post[]> {
  if (!youtubeConfigured()) return [];
  return cached(`yt:${query}:${limit}`, 6 * HOUR, async () => {
    const data = await get<{ items?: SearchItem[] }>("search", {
      part: "snippet", type: "video", q: `${query} outfit`, maxResults: String(limit),
      order: "relevance", safeSearch: "strict",
    });
    return (data.items ?? []).flatMap((it): Post[] => {
      const id = it.id?.videoId;
      const s = it.snippet;
      if (!id || !s) return [];
      return [{
        id: `yt:${id}`, platform: "youtube", kind: "video",
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: safeUrl(s.thumbnails?.high?.url ?? s.thumbnails?.medium?.url),
        title: s.title, author: s.channelTitle,
        authorUrl: s.channelId ? `https://www.youtube.com/channel/${s.channelId}` : undefined,
        publishedAt: s.publishedAt, query,
      }];
    });
  });
}

/** Confirm a suggested YouTube creator exists, by handle. */
export async function verifyYouTube(c: Creator): Promise<Creator> {
  if (!youtubeConfigured() || !c.handle) return c;
  return cached(`ytc:${c.handle}`, 24 * HOUR, async () => {
    const data = await get<{ items?: { id: string; snippet?: { title?: string; customUrl?: string; thumbnails?: Record<string, { url?: string }> }; statistics?: { subscriberCount?: string } }[] }>(
      "channels", { part: "snippet,statistics", forHandle: `@${c.handle}` },
    );
    const ch = data.items?.[0];
    if (!ch) return { ...c, verified: false };
    return {
      ...c, verified: true,
      followers: ch.statistics?.subscriberCount ? Number(ch.statistics.subscriberCount) : undefined,
      avatar: safeUrl(ch.snippet?.thumbnails?.default?.url),
      url: `https://www.youtube.com/${ch.snippet?.customUrl ?? `channel/${ch.id}`}`,
    };
  });
}
