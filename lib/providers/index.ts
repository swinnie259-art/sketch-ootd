import type { Analysis, Creator, Post, ProviderStatus } from "../schema";
import { cleanHandle, profileUrl } from "../links";
import { instagramConfigured, searchInstagram, verifyInstagram } from "./instagram";
import { searchTikTok, tiktokConfigured, verifyTikTok } from "./tiktok";
import { searchYouTube, verifyYouTube, youtubeConfigured } from "./youtube";

type Search = Analysis["searches"][number];

/** Run every configured platform for every search, collecting per-platform status instead of failing the request. */
export async function findPosts(searches: Search[]): Promise<{ posts: Post[]; status: ProviderStatus[] }> {
  const jobs = {
    instagram: { on: instagramConfigured(), run: (s: Search) => searchInstagram(s.hashtag, s.query, 6) },
    youtube: { on: youtubeConfigured(), run: (s: Search) => searchYouTube(s.query, 4) },
    tiktok: { on: tiktokConfigured(), run: (s: Search) => searchTikTok(s.hashtag, s.query, 5) },
  } as const;

  const status: ProviderStatus[] = [];
  const all: Post[] = [];
  await Promise.all(
    (Object.keys(jobs) as (keyof typeof jobs)[]).map(async (platform) => {
      const job = jobs[platform];
      if (!job.on) return void status.push({ platform, configured: false, count: 0 });
      const results = await Promise.allSettled(searches.map((s) => job.run(s)));
      const errors = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason?.message ?? r.reason)] : []));
      const posts = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      all.push(...posts);
      status.push({ platform, configured: true, count: posts.length, error: errors[0] });
    }),
  );

  const seen = new Set<string>();
  const posts = all.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  return { posts, status };
}

export async function verifyCreators(creators: Analysis["creators"]): Promise<Creator[]> {
  return Promise.all(
    creators.map(async (raw) => {
      const c: Creator = { ...raw, handle: cleanHandle(raw.handle) };
      c.url = profileUrl(c.platform, c.handle);
      try {
        if (c.platform === "instagram") return await verifyInstagram(c);
        if (c.platform === "youtube") return await verifyYouTube(c);
        return await verifyTikTok(c);
      } catch {
        return c;
      }
    }),
  );
}
