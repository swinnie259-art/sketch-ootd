import { z } from "zod";
import { verifyCreators } from "@/lib/providers";
import { Platform } from "@/lib/schema";

export const runtime = "nodejs";

const Body = z.object({
  creators: z.array(z.object({
    name: z.string().max(80), handle: z.string().max(60), platform: Platform,
    style: z.string().max(80), why: z.string().max(200),
  })).max(8),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请求格式不对。" }, { status: 400 });
  return Response.json({ creators: await verifyCreators(parsed.data.creators) });
}
