"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Analysis, Creator, Post, Product, ProviderStatus } from "@/lib/schema";
import { profileUrl, searchLinks, shopLink } from "@/lib/links";
import { CAT_CN, Logo, Scribble, Sketch } from "./components/Sketch";
import { Collage } from "./components/Collage";
import { EXAMPLE } from "./example";

const PLAT = { instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok" } as const;
const enc = encodeURIComponent;

type OotdState = { loading: boolean; posts: Post[]; status: ProviderStatus[]; error?: string };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pref, setPref] = useState("");
  const [analysis, setAnalysis] = useState<Analysis>(EXAMPLE);
  const [isExample, setIsExample] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [creators, setCreators] = useState<Creator[]>(withUrls(EXAMPLE.creators));
  const [ootd, setOotd] = useState<OotdState>({ loading: false, posts: [], status: [] });
  // null = still searching; {} = none found or shopping search not configured
  const [products, setProducts] = useState<Record<string, Product> | null>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const ctl = useRef<AbortController | null>(null);

  const pick = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return setError("请选择 JPG、PNG、WebP 或 GIF 图片。");
    if (f.size > 5 * 1024 * 1024) return setError("图片超过 5MB，压缩一下再传。");
    setError(null);
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => pick(e.clipboardData?.files?.[0]);
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [pick]);

  function reset() {
    ctl.current?.abort();
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setAnalysis(EXAMPLE);
    setIsExample(true);
    setCreators(withUrls(EXAMPLE.creators));
    setOotd({ loading: false, posts: [], status: [] });
    setProducts({});
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function run() {
    if (!file) return;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setBusy(true);
    setError(null);
    setOotd({ loading: false, posts: [], status: [] });
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("pref", pref);
      const r = await fetch("/api/analyze", { method: "POST", body: fd, signal: c.signal });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "识别失败了，再试一次。");
      const a: Analysis = j.analysis;
      if (!a.item.is_fashion) throw new Error("这张图里好像不是服饰单品，换一张衣服、鞋包或配饰的照片吧。");
      setAnalysis(a);
      setIsExample(false);
      setCreators(withUrls(a.creators));
      setBusy(false);
      loadExtras(a, c.signal);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function loadExtras(a: Analysis, signal: AbortSignal) {
    setOotd({ loading: true, posts: [], status: [] });
    setProducts(null);
    const queries = [...new Set(a.looks.slice(0, 3).flatMap((l) => l.pieces.filter((p) => !p.is_main).map((p) => p.name_en)))];
    const productReq = fetch("/api/products", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ queries: queries.slice(0, 16) }),
    }).then(async (r) => setProducts(r.ok ? (await r.json()).products ?? {} : {}))
      .catch((e: Error) => { if (e.name !== "AbortError") setProducts({}); });
    const item = `${a.item.name}（${a.item.name_en}），${a.item.color}，${a.item.material}，${a.item.silhouette}`;
    const ootdReq = fetch("/api/ootd", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ item, searches: a.searches.slice(0, 4) }),
    }).then(async (r) => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setOotd({ loading: false, posts: j.posts, status: j.status });
    }).catch((e: Error) => {
      if (e.name !== "AbortError") setOotd({ loading: false, posts: [], status: [], error: e.message || "没搜到，稍后再试。" });
    });
    const creatorReq = fetch("/api/creators", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ creators: a.creators.slice(0, 8) }),
    }).then(async (r) => {
      if (r.ok) setCreators((await r.json()).creators);
    }).catch(() => {});
    await Promise.all([ootdReq, creatorReq, productReq]);
  }

  const it = analysis.item;
  return (
    <div className="wrap">
      <header>
        <div className="logo"><Logo /><div><b>单品搭</b><i>sketch ootd</i></div></div>
        <p className="tag">upload one piece · find the rest of the look</p>
      </header>

      <section className="top">
        <div
          className={`drop sk dash${over ? " over" : ""}`} role="button" tabIndex={0} aria-label="上传单品照片"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inputRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
        >
          <div className="frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="你上传的单品" /> : <Sketch cat="outer" />}
          </div>
          <p className="hand">拖一张单品照片进来，点这里选图，或直接粘贴</p>
          <input ref={inputRef} id="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr" onChange={(e) => pick(e.target.files?.[0])} />
          <div className="pref" onClick={(e) => e.stopPropagation()}>
            <label htmlFor="pref">我的风格 / 场合（可选）</label>
            <input id="pref" type="text" value={pref} maxLength={200} onChange={(e) => setPref(e.target.value)} placeholder="例：通勤极简，160cm，想要法式松弛感" />
          </div>
          <div className="row" onClick={(e) => e.stopPropagation()}>
            <button className="btn" onClick={run} disabled={!file || busy}>{busy ? "识别中…" : "识别并搭配"}</button>
            {file && <button className="ghost" onClick={reset}>换一张</button>}
          </div>
        </div>

        {busy ? (
          <div className="idcard sk alt"><Scribble label="正在看你的单品…" /></div>
        ) : error ? (
          <div className="err sk"><p>{error}</p></div>
        ) : (
          <div className="idcard sk alt">
            <span className="badge sk">{isExample ? "示例 · example" : "识别结果"}</span>
            <h3>{it.name}</h3>
            {it.name_en && <div className="en">{it.name_en}</div>}
            <dl>
              {([["品类", CAT_CN[it.category]], ["颜色", it.color], ["材质", it.material], ["版型", it.silhouette], ["季节", it.season]] as const)
                .filter(([, v]) => v)
                .map(([k, v]) => <Pair key={k} k={k} v={v} />)}
            </dl>
            <div className="chips">{it.style_tags.slice(0, 6).map((t) => <span key={t} className="chip sk">{t}</span>)}</div>
          </div>
        )}
      </section>

      {isExample && <p className="example-flag">↓ 以下是示例结果，上传你的单品后会替换成你的专属搭配</p>}

      <section className="sec">
        <h2><span className="mark">适合搭配的单品</span><span className="en">pair it with</span></h2>
        <div className="grid">
          {analysis.pairings.slice(0, 8).map((p, i) => (
            <article key={i} className={`piece sk${i % 2 ? " alt" : ""}`}>
              <Sketch cat={p.category} />
              <div className="cat">{CAT_CN[p.category]}</div>
              <h4>{p.name}</h4>
              <p>{p.why}</p>
              <div className="links">
                <a href={`https://www.instagram.com/explore/search/keyword/?q=${enc(p.name_en + " outfit")}`} target="_blank" rel="noopener">看穿搭</a>
                <a href={`https://www.tiktok.com/search?q=${enc(p.name_en + " outfit")}`} target="_blank" rel="noopener">TikTok</a>
                <a href={shopLink(p.name_en)} target="_blank" rel="noopener">找同款</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sec">
        <h2><span className="mark">整套搭配公式</span><span className="en">3 ways to wear it</span></h2>
        <div className="looks">
          {analysis.looks.slice(0, 3).map((l, i) => (
            <article key={i} className={`look sk${i % 2 ? "" : " alt"}`}>
              <div className="no">{i + 1}</div>
              <h4>{l.title}</h4>
              {l.vibe && <div className="vibe">{l.vibe}</div>}
              <Collage pieces={l.pieces} mainImage={isExample ? null : preview} products={products} />
              <ul className="pieces">
                {l.pieces.slice(0, 6).map((x, j) => {
                  const prod = x.is_main ? undefined : products?.[x.name_en];
                  return (
                    <li key={j}>
                      <span>{x.name}{x.is_main && <em> · 你的单品</em>}</span>
                      {!x.is_main && (
                        <a href={prod?.link ?? shopLink(x.name_en)} target="_blank" rel="noopener">
                          {prod?.price ? `${prod.price} ↗` : "找同款 ↗"}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
              {l.tip && <p className="tip">✎ {l.tip}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="sec">
        <h2><span className="mark">同款单品的 OOTD</span><span className="en">real looks</span></h2>
        <OotdWall state={ootd} isExample={isExample} />
        <div className="stack">
          {analysis.searches.slice(0, 4).map((s, i) => (
            <div key={i} className={`search sk${i % 2 ? " alt" : ""}`}>
              <div style={{ minWidth: 0 }}>
                <h4>{s.label}</h4>
                <div className="q">{s.query}{s.hashtag ? `  #${s.hashtag.replace(/^#/, "")}` : ""}</div>
              </div>
              <div className="links">
                {searchLinks(s.query, s.hashtag).map(([t, u]) => <a key={t} href={u} target="_blank" rel="noopener">{t}</a>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <h2><span className="mark">可以参考的博主</span><span className="en">who to follow</span></h2>
        <p className="sub">由 Claude 按风格推荐；带 ✓ 的账号已通过平台 API 核对。</p>
        <div className="people sk alt">
          {creators.slice(0, 6).map((c, i) => (
            <div key={i} className="person">
              <div className="ava sk">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.avatar ? <img src={c.avatar} alt="" /> : (c.name.trim()[0] ?? "?").toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <h4>
                  {c.name}
                  {c.handle && <span>@{c.handle}</span>}
                  {c.verified && <b className="check" title="已核对">✓</b>}
                </h4>
                <p>{[c.style, c.why, c.followers ? `${fmt(c.followers)} 关注` : ""].filter(Boolean).join(" · ")}</p>
              </div>
              <a className="plat sk" href={c.url ?? `https://www.google.com/search?q=${enc(`${c.name} ${PLAT[c.platform]}`)}`} target="_blank" rel="noopener">
                {PLAT[c.platform]} ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      <footer>识别与搭配建议由 Claude 生成 · 帖子来自 Instagram Graph API、YouTube Data API、TikTok Research API，版权归原作者</footer>
    </div>
  );
}

function OotdWall({ state, isExample }: { state: OotdState; isExample: boolean }) {
  if (isExample) return <div className="empty sk dash"><p className="hand">上传单品后，这里会出现各平台上穿了类似单品的真实 OOTD</p></div>;
  if (state.loading) return <div className="sk dash"><Scribble label="正在翻 Instagram · TikTok · YouTube…" /></div>;
  if (state.error) return <div className="err sk"><p>{state.error}</p></div>;

  const off = state.status.filter((s) => !s.configured).map((s) => PLAT[s.platform]);
  const failed = state.status.filter((s) => s.configured && s.error && s.count === 0).map((s) => PLAT[s.platform]);
  return (
    <>
      {(off.length > 0 || failed.length > 0) && (
        <div className="status">
          {off.length > 0 && <span className="sk">{off.join(" / ")} 未接入，用下面的搜索链接查看</span>}
          {failed.length > 0 && <span className="sk">{failed.join(" / ")} 暂时取不到数据</span>}
        </div>
      )}
      {state.posts.length === 0 ? (
        <div className="empty sk dash"><p>这次没有找到足够相似的帖子，试试下面的平台搜索。</p></div>
      ) : (
        <div className="wall">
          {state.posts.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noopener" className={`post sk${p.thumbnail ? "" : " textonly"}`}>
              {p.thumbnail && (
                <div className="ph">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail} alt={p.title?.slice(0, 80) ?? ""} loading="lazy" referrerPolicy="no-referrer" />
                  {p.kind === "video" && <span className="play">▶ 视频</span>}
                </div>
              )}
              <div className="meta">
                <span className="pf">{PLAT[p.platform]}</span>
                <span>{[p.author && `@${p.author}`, p.likes && `♡ ${fmt(p.likes)}`].filter(Boolean).join(" · ")}</span>
              </div>
              {p.note && <div className="why">✎ {p.note}</div>}
              {p.title && <div className="cap">{p.title}</div>}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return <><dt>{k}</dt><dd>{v}</dd></>;
}

function withUrls(cs: Analysis["creators"]): Creator[] {
  return cs.map((c) => ({ ...c, url: profileUrl(c.platform, c.handle) }));
}

function fmt(n: number) {
  const short = (x: number) => x.toFixed(1).replace(/\.0$/, "");
  if (n >= 1e6) return `${short(n / 1e6)}M`;
  if (n >= 1e4) return `${short(n / 1e4)}万`;
  return String(n);
}
