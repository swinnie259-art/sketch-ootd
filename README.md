# 单品搭 · Sketch OOTD

上传一件喜欢的单品 → 识别它 → 推荐搭配单品和整套公式 → 找到 Instagram / TikTok / YouTube 上穿了类似单品的真实 OOTD → 推荐可参考的博主。黑白手绘线条风格。

## 工作流程

```
浏览器 ──图片──▶ /api/analyze ──▶ Claude（看图）：识别单品、搭配、博主、搜索词
         │
         ├────▶ /api/ootd ──▶ Instagram 话题标签热门帖 ┐
         │                  ─▶ YouTube 视频搜索         ├─▶ Claude 看缩略图打分，只留含相似单品的穿搭
         │                  ─▶ TikTok 话题视频          ┘
         ├────▶ /api/products ─▶ 每套搭配里的单品 → 购物搜索取真实商品图 → 拼贴
         └────▶ /api/creators ─▶ 用各平台 API 核对博主账号（✓、粉丝数、头像）
```

每个平台都是可选的：没配 key 的平台会自动退回「平台搜索链接」，页面照常可用。只配 Claude key 也能跑起来。

## 本地运行

需要 Node.js 20+。

```bash
npm install
```

```bash
cp .env.example .env.local
```

在 `.env.local` 里至少填上 `ANTHROPIC_API_KEY`，然后：

```bash
npm run dev
```

打开 http://localhost:3000 。

## 各平台 API 怎么申请

| 平台 | 用的接口 | 申请难度 | 要填的变量 |
|---|---|---|---|
| Claude | Messages API（看图 + 结构化输出） | 注册即用 | `ANTHROPIC_API_KEY` |
| YouTube | Data API v3 `search.list`、`channels.list` | 简单，免费额度每天 10,000 单位（一次搜索 100 单位，结果缓存 6 小时） | `YOUTUBE_API_KEY` |
| Instagram | Graph API 话题标签搜索 `ig_hashtag_search` + `top_media`，博主核对用 Business Discovery | 中等：需要一个 Instagram 商业/创作者账号绑定 Facebook 主页，并在 Meta App 里申请 Instagram Public Content Access | `IG_USER_ID`、`IG_ACCESS_TOKEN` |
| TikTok | Research API `video/query`、`user/info`；封面图来自公开的 oEmbed | 难：仅向通过审核的研究机构开放 | `TIKTOK_CLIENT_KEY`、`TIKTOK_CLIENT_SECRET` |
| 商品图（搭配拼贴） | SerpApi 的 Google Shopping 搜索，每件单品取第一张白底商品图 | 简单，注册即用；免费额度每月约 100 次搜索，结果缓存 24 小时 | `SERPAPI_KEY`、`SHOPPING_COUNTRY` |

**几个限制要知道：**
- Instagram 每个账号 7 天内最多查 30 个不同话题标签，代码里把标签 id 缓存了一周；话题帖子接口不返回作者用户名。Business Discovery 只能查到商业/创作者账号，个人账号查不到不代表是假账号。
- TikTok Research API 一次查询的时间窗口最多 30 天，只能拿公开视频的元数据。如果拿不到资格，可以换成有授权的第三方数据服务，只需改 `lib/providers/tiktok.ts`。
- 小红书没有公开的搜索 API，页面只提供搜索链接。
- 所有帖子都只展示缩略图并跳转到原帖，不转存图片和视频，版权归原作者。

## 代码结构

```
app/page.tsx              页面（上传、结果、OOTD 墙、博主）
app/globals.css           手绘黑白风格：SVG 抖动滤镜画的墨线边框
app/api/analyze           上传图片 → Claude 识别与搭配
app/api/ootd              多平台搜帖子 → Claude 看缩略图重排
app/api/creators          核对博主账号
app/api/products          搭配拼贴用的商品图
app/components/Collage.tsx  拼贴排版：按品类放位置，白底商品图用 multiply 融进纸面
lib/claude.ts             Claude 调用（claude-opus-5-5，结构化输出，拒答时自动回退模型）
lib/providers/*.ts        Instagram / YouTube / TikTok 接入
lib/cache.ts, ratelimit.ts  进程内缓存和按 IP 限流
```

## 部署

可以直接部署到 Vercel（在项目设置里填环境变量）。上线前建议：
- 把 `lib/cache.ts` 和 `lib/ratelimit.ts` 换成 Redis（如 Upstash），多实例时才共享得了。
- 加登录或验证码，防止别人刷你的 Claude 额度。
- `/api/analyze` 和 `/api/ootd` 单次可能要 20–60 秒，Vercel 上需要允许 120 秒的函数时长（代码里已设 `maxDuration = 120`）。
