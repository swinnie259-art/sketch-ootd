import Anthropic from "@anthropic-ai/sdk";
import { analyzeItem, IMAGE_TYPES, RefusedError, type ImageMedia } from "@/lib/claude";
import { limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 5 * 1024 * 1024; // Claude's per-image limit

export async function POST(req: Request) {
  if (limited(req, 6)) return Response.json({ error: "请求太频繁，请一分钟后再试。" }, { status: 429 });

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error("Set ANTHROPIC_API_KEY in .env.local");
    return Response.json({ error: "服务端还没有配置 Claude API key。" }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  const pref = String(form?.get("pref") ?? "").slice(0, 200);
  if (!(file instanceof File)) return Response.json({ error: "请上传一张图片。" }, { status: 400 });
  if (!IMAGE_TYPES.includes(file.type as ImageMedia))
    return Response.json({ error: "只支持 JPG、PNG、WebP、GIF 图片。" }, { status: 415 });
  if (file.size > MAX_BYTES) return Response.json({ error: "图片超过 5MB，压缩一下再传。" }, { status: 413 });

  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const analysis = await analyzeItem({ data, mediaType: file.type as ImageMedia }, pref);
    return Response.json({ analysis });
  } catch (e) {
    if (e instanceof RefusedError) return Response.json({ error: "这张图片无法分析，换一张单品照片试试。" }, { status: 422 });
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "识别服务繁忙，稍后再试。" }, { status: 503 });
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY is missing or invalid");
      return Response.json({ error: "服务端没有配置好 Claude API key。" }, { status: 500 });
    }
    console.error("analyze failed", e);
    return Response.json({ error: "识别失败了，再试一次。" }, { status: 502 });
  }
}
