import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { Analysis, Rerank, type Post } from "./schema";

const MODEL = "claude-opus-5-5";
// On a safety decline the API re-runs the request on a fallback model chosen by refusal category.
const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

let client: Anthropic | null = null;
function claude() {
  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY
  return client;
}

export type ImageMedia = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export const IMAGE_TYPES: ImageMedia[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export class RefusedError extends Error {}

const ANALYZE_PROMPT = (pref: string) => `你是一位资深时尚造型师。图片是用户喜欢的一件单品。${
  pref ? `\n用户的风格 / 场合 / 身材偏好：「${pref}」。所有建议都要贴合这个偏好。` : ""
}

请完成：
1. 识别这件单品（品类、颜色、材质、版型、季节、风格标签）。
2. 推荐 6 件适合搭配的其他单品，覆盖不同品类，每件写清颜色和材质，并用一句话说明为什么配。
3. 给出 3 套完整搭配，每套 4-5 件，各有不同场景。其中一件就是用户这件单品（is_main=true），其余每件的 name_en 写成能直接在购物网站搜到具体商品的英文关键词（含性别、颜色、材质、款式）。
4. 推荐 4-6 位以穿搭内容为主、风格与这件单品契合的真实博主，尽量覆盖 Instagram、YouTube、TikTok。只写你确信存在的人；账号名不确定时 handle 留空字符串。
5. 给出 3-4 组英文搜索词和一个常用英文话题标签，用来在各平台找到穿了类似单品的 OOTD 图文或视频。

如果图片不是服饰、鞋包或配饰，把 item.is_fashion 设为 false，数组留空，其他字段填空字符串。
中文字段用简体中文。`;

export async function analyzeItem(image: { data: string; mediaType: ImageMedia }, pref: string): Promise<Analysis> {
  const res = await claude().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: betaZodOutputFormat(Analysis) },
    ...FALLBACK,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
          { type: "text", text: ANALYZE_PROMPT(pref) },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new RefusedError("This image could not be analyzed.");
  if (!res.parsed_output) throw new Error(`Claude returned no parseable analysis (stop_reason=${res.stop_reason})`);
  return res.parsed_output;
}

/**
 * Look at candidate post thumbnails and score how well each shows a similar item
 * worn in an outfit. Posts without a fetchable thumbnail are scored on their text.
 */
export async function rerankPosts(itemDesc: string, posts: Post[]): Promise<Post[]> {
  if (posts.length === 0) return posts;

  const thumbs = await Promise.all(posts.map((p) => (p.thumbnail ? fetchImage(p.thumbnail) : Promise.resolve(null))));

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    {
      type: "text",
      text: `用户喜欢的单品：${itemDesc}\n\n下面是从各平台搜到的候选帖子，按编号给出。请给每个帖子打 0-10 分：画面里是否有与这件单品相似的单品，并且是完整的穿搭展示（OOTD）。广告、无关内容、只有单品平铺图给低分。`,
    },
  ];
  posts.forEach((p, i) => {
    content.push({
      type: "text",
      text: `#${i} [${p.platform}${p.kind === "video" ? " 视频" : ""}] ${(p.title ?? "").slice(0, 280)}`,
    });
    const t = thumbs[i];
    if (t) content.push({ type: "image", source: { type: "base64", media_type: t.mediaType, data: t.data } });
  });

  const res = await claude().beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low", format: betaZodOutputFormat(Rerank) },
    ...FALLBACK,
    messages: [{ role: "user", content }],
  });
  const scores = res.parsed_output?.scores;
  if (!scores) return posts;

  const byIndex = new Map(scores.map((s) => [s.index, s]));
  return posts
    .map((p, i) => ({ ...p, score: byIndex.get(i)?.score ?? 0, note: byIndex.get(i)?.note }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

async function fetchImage(url: string): Promise<{ data: string; mediaType: ImageMedia } | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const type = (r.headers.get("content-type") ?? "").split(";")[0].trim() as ImageMedia;
    if (!IMAGE_TYPES.includes(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength > 4_000_000) return null;
    return { data: buf.toString("base64"), mediaType: type };
  } catch {
    return null;
  }
}
