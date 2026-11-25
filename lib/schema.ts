import { z } from "zod";

export const CATEGORIES = ["top", "outer", "bottom", "skirt", "dress", "shoes", "bag", "accessory"] as const;
export const Category = z.enum(CATEGORIES);
export type Category = z.infer<typeof Category>;

export const PLATFORMS = ["instagram", "youtube", "tiktok"] as const;
export const Platform = z.enum(PLATFORMS);
export type Platform = z.infer<typeof Platform>;

/** What Claude returns after looking at the uploaded piece. */
export const Analysis = z.object({
  item: z.object({
    is_fashion: z.boolean().describe("false if the photo is not a clothing item, shoe, bag or accessory"),
    name: z.string().describe("中文单品名，含颜色与材质"),
    name_en: z.string().describe("English name, used as a search keyword"),
    category: Category,
    color: z.string(),
    material: z.string(),
    silhouette: z.string().describe("版型"),
    season: z.string(),
    style_tags: z.array(z.string()).describe("3-5 个风格标签"),
  }),
  pairings: z
    .array(
      z.object({
        category: Category,
        name: z.string().describe("具体单品，含颜色材质"),
        name_en: z.string().describe("English search keyword for this piece"),
        why: z.string().describe("一句话搭配理由"),
      }),
    )
    .describe("6 pieces that pair well with the item"),
  looks: z
    .array(
      z.object({
        title: z.string(),
        vibe: z.string().describe("short English phrase"),
        pieces: z
          .array(
            z.object({
              name: z.string().describe("中文单品名，含颜色材质"),
              name_en: z.string().describe("specific English shopping query, e.g. \"women's black nylon cargo parachute pants\""),
              category: Category,
              is_main: z.boolean().describe("true only for the user's uploaded item"),
            }),
          )
          .describe("4-5 pieces; exactly one is the uploaded item with is_main=true"),
        tip: z.string(),
      }),
    )
    .describe("3 complete outfits"),
  creators: z
    .array(
      z.object({
        name: z.string(),
        handle: z.string().describe("account name without @; empty string if not certain"),
        platform: Platform,
        style: z.string(),
        why: z.string(),
      }),
    )
    .describe("4-6 real fashion creators whose style fits this item"),
  searches: z
    .array(
      z.object({
        label: z.string().describe("中文标题"),
        query: z.string().describe("English query to find OOTDs wearing a similar item"),
        hashtag: z.string().describe("one popular English hashtag, no #, lowercase, no spaces"),
      }),
    )
    .describe("3-4 searches"),
});
export type Analysis = z.infer<typeof Analysis>;

/** Re-ranking verdict for candidate posts. */
export const Rerank = z.object({
  scores: z.array(
    z.object({
      index: z.number().int(),
      score: z.number().describe("0-10: how clearly the post shows a similar item styled in an outfit"),
      note: z.string().describe("≤ 20 个中文字，这套里怎么搭的"),
    }),
  ),
});
export type Rerank = z.infer<typeof Rerank>;

/** A post found on a platform, normalized across providers. */
export type Post = {
  id: string;
  platform: Platform;
  kind: "image" | "video" | "carousel";
  url: string;
  thumbnail?: string;
  title?: string;
  author?: string;
  authorUrl?: string;
  publishedAt?: string;
  likes?: number;
  query: string;
  /** Filled in by re-ranking */
  score?: number;
  note?: string;
};

/** A real product photo found for one outfit piece. */
export type Product = { image: string; title?: string; price?: string; link?: string; source?: string };

export type ProviderStatus = { platform: Platform; configured: boolean; error?: string; count: number };

export type Creator = Analysis["creators"][number] & {
  verified?: boolean;
  followers?: number;
  avatar?: string;
  url?: string;
};
