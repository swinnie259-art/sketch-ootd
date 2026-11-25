import { cached, HOUR } from "../cache";
import { cleanTag, safeUrl } from "../links";
import type { Creator, Post } from "../schema";

const ver = () => process.env.IG_GRAPH_VERSION || "v21.0";
const userId = () => process.env.IG_USER_ID;
const token = () => process.env.IG_ACCESS_TOKEN;
export const instagramConfigured = () => !!(userId() && token());

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, access_token: token()! });
  const r = await fetch(`https://graph.facebook.com/${ver()}/${path}?${qs}`, { signal: AbortSignal.timeout(8000) });
  const body = (await r.json()) as T & { error?: { message?: string } };
  if (!r.ok || body.error) throw new Error(`Instagram ${path}: ${body.error?.message ?? r.status}`);
  return body;
}

type Media = {
  id: string; caption?: string; media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string; permalink?: string; timestamp?: string; like_count?: number;
};

/**
 * Top posts for a hashtag via the Graph API hashtag search.
 * Meta limits each IG user to 30 unique hashtags per rolling 7 days — hashtag ids are cached for a week.
 */
export async function searchInstagram(hashtag: string, query: string, limit = 9): Promise<Post[]> {
  if (!instagramConfigured()) return [];
  const tag = cleanTag(hashtag);
  if (!tag) return [];
  const tagId = await cached(`igtag:${tag}`, 7 * 24 * HOUR, async () => {
    const r = await graph<{ data?: { id: string }[] }>("ig_hashtag_search", { user_id: userId()!, q: tag });
    return r.data?.[0]?.id ?? null;
  });
  if (!tagId) return [];
  return cached(`igtop:${tagId}:${limit}`, 6 * HOUR, async () => {
    const r = await graph<{ data?: Media[] }>(`${tagId}/top_media`, {
      user_id: userId()!, limit: String(limit),
      fields: "id,caption,media_type,media_url,permalink,timestamp,like_count",
    });
    return (r.data ?? []).flatMap((m): Post[] => {
      const url = safeUrl(m.permalink);
      if (!url) return [];
      return [{
        id: `ig:${m.id}`, platform: "instagram",
        kind: m.media_type === "VIDEO" ? "video" : m.media_type === "CAROUSEL_ALBUM" ? "carousel" : "image",
        url,
        // For videos media_url is the video file, so there is no still to show.
        thumbnail: m.media_type === "VIDEO" ? undefined : safeUrl(m.media_url),
        title: m.caption?.slice(0, 300), publishedAt: m.timestamp, likes: m.like_count, query,
      }];
    });
  });
}

/** Business Discovery only sees Business/Creator accounts; a miss means "unverified", not "fake". */
export async function verifyInstagram(c: Creator): Promise<Creator> {
  if (!instagramConfigured() || !c.handle) return c;
  return cached(`igc:${c.handle}`, 24 * HOUR, async () => {
    try {
      const r = await graph<{ business_discovery?: { username: string; followers_count?: number; profile_picture_url?: string } }>(
        userId()!, { fields: `business_discovery.username(${c.handle}){username,followers_count,profile_picture_url}` },
      );
      const b = r.business_discovery;
      if (!b) return c;
      return { ...c, verified: true, followers: b.followers_count, avatar: safeUrl(b.profile_picture_url), url: `https://www.instagram.com/${b.username}/` };
    } catch {
      return c;
    }
  });
}
