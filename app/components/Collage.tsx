"use client";

import { useState } from "react";
import type { Analysis, Category, Product } from "@/lib/schema";
import { Sketch } from "./Sketch";

type Piece = Analysis["looks"][number]["pieces"][number];
type Slot = { l: number; t: number; w: number; r: number; z: number };

/* Where each kind of garment lands on the board (percent of board width/height),
   roughly where it sits on a body: tops upper-left, bottoms right, shoes at the foot. */
const UPPER_A: Slot = { l: 3, t: 3, w: 52, r: -4, z: 2 };
const UPPER_B: Slot = { l: 47, t: 5, w: 42, r: 4, z: 1 };
const LOWER_A: Slot = { l: 42, t: 33, w: 46, r: 3, z: 3 };
const LOWER_B: Slot = { l: 4, t: 38, w: 42, r: -3, z: 3 };
const FEET_A: Slot = { l: 6, t: 70, w: 36, r: -6, z: 5 };
const FEET_B: Slot = { l: 44, t: 74, w: 30, r: 4, z: 5 };
const BAG_A: Slot = { l: 62, t: 64, w: 32, r: 6, z: 4 };
const BAG_B: Slot = { l: 6, t: 58, w: 30, r: -4, z: 4 };
const ACC_A: Slot = { l: 68, t: 3, w: 26, r: 8, z: 6 };
const ACC_B: Slot = { l: 40, t: 80, w: 22, r: -5, z: 6 };

const OPTIONS: Record<Category, Slot[]> = {
  outer: [UPPER_A, UPPER_B, LOWER_B],
  top: [UPPER_A, UPPER_B, LOWER_B],
  dress: [UPPER_A, UPPER_B, LOWER_A],
  bottom: [LOWER_A, LOWER_B, UPPER_B],
  skirt: [LOWER_A, LOWER_B, UPPER_B],
  shoes: [FEET_A, FEET_B, BAG_B],
  bag: [BAG_A, BAG_B, ACC_B],
  accessory: [ACC_A, ACC_B, BAG_B],
};
const ALL = [UPPER_A, UPPER_B, LOWER_A, LOWER_B, FEET_A, FEET_B, BAG_A, BAG_B, ACC_A, ACC_B];

function layout(pieces: Piece[]): Slot[] {
  const used = new Set<Slot>();
  // Place the user's own piece first so it gets the best spot for its category.
  const order = pieces.map((p, i) => i).sort((a, b) => Number(pieces[b].is_main) - Number(pieces[a].is_main));
  const out: Slot[] = [];
  for (const i of order) {
    const slot = OPTIONS[pieces[i].category]?.find((s) => !used.has(s)) ?? ALL.find((s) => !used.has(s)) ?? UPPER_A;
    used.add(slot);
    out[i] = slot;
  }
  return out;
}

export function Collage({
  pieces, mainImage, products,
}: {
  pieces: Piece[];
  mainImage: string | null;
  products: Record<string, Product> | null;
}) {
  const slots = layout(pieces.slice(0, 6));
  return (
    <div className="collage sk alt" role="img" aria-label={`搭配拼贴：${pieces.map((p) => p.name).join("、")}`}>
      {pieces.slice(0, 6).map((p, i) => {
        const s = slots[i];
        const style = { left: `${s.l}%`, top: `${s.t}%`, width: `${s.w}%`, transform: `rotate(${s.r}deg)`, zIndex: s.z } as React.CSSProperties;
        if (p.is_main) {
          return (
            <figure key={i} className="tile polaroid" style={{ ...style, width: `${Math.min(s.w, 40)}%`, zIndex: 9 }}>
              <span className="tape" aria-hidden="true" />
              {mainImage ? <Photo src={mainImage} cat={p.category} cover /> : <Sketch cat={p.category} />}
              <figcaption>your piece</figcaption>
            </figure>
          );
        }
        const prod = products?.[p.name_en];
        return (
          <figure key={i} className={`tile${prod ? " cut" : " drawn"}`} style={style} title={prod?.title ?? p.name}>
            {prod ? <Photo src={prod.image} cat={p.category} /> : <Sketch cat={p.category} />}
          </figure>
        );
      })}
      {products === null && <span className="collage-wait">找图中…</span>}
    </div>
  );
}

/** A product photo; if it fails to load, the hand-drawn sketch takes its place. */
function Photo({ src, cat, cover }: { src: string; cat: Category; cover?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <Sketch cat={cat} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className={cover ? "cover" : undefined} onError={() => setBroken(true)} />;
}
