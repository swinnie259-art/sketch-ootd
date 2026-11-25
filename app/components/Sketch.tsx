import type { Category } from "@/lib/schema";

const PATHS: Record<Category, string> = {
  top: "M22 10 L12 16 L6 28 L14 32 L18 26 L18 56 L46 56 L46 26 L50 32 L58 28 L52 16 L42 10 Q32 18 22 10 Z",
  outer: "M23 8 L11 14 L6 52 L14 52 L16 28 L16 58 L48 58 L48 28 L50 52 L58 52 L53 14 L41 8 L32 30 Z M32 30 L32 58 M35 38 l1 0 M35 46 l1 0",
  bottom: "M18 8 H46 L50 58 H36 L32 24 L28 58 H14 Z M18 14 H46",
  skirt: "M20 10 H44 L54 54 Q32 60 10 54 Z M20 16 H44 M27 18 L22 54 M37 18 L42 54",
  dress: "M25 6 L26 16 L20 30 L12 56 Q32 62 52 56 L44 30 L38 16 L39 6 M26 16 Q32 21 38 16 M20 30 H44",
  shoes: "M8 40 L10 28 Q20 30 26 24 L30 30 Q42 34 54 36 Q58 38 58 44 L8 44 Z M8 44 L8 48 H58 V44",
  bag: "M12 24 H52 L48 56 H16 Z M22 24 Q22 10 32 10 Q42 10 42 24 M30 34 H34",
  accessory: "M6 28 H58 M10 28 Q10 40 20 40 Q28 40 28 28 M36 28 Q36 40 46 40 Q54 40 54 28 M28 30 Q32 27 36 30",
};

export const CAT_CN: Record<Category, string> = {
  top: "上衣", outer: "外套", bottom: "裤装", skirt: "半裙", dress: "连衣裙", shoes: "鞋", bag: "包", accessory: "配饰",
};

export function Sketch({ cat }: { cat: Category }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="rough" aria-hidden="true">
      <path d={PATHS[cat] ?? PATHS.accessory} />
    </svg>
  );
}

export function Logo() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="rough" aria-hidden="true">
      <path d="M32 12 Q32 6 37 7 Q41 9 38 13 L32 18 M32 18 L6 40 Q4 44 9 44 H55 Q60 44 58 40 Z" />
    </svg>
  );
}

export function Scribble({ label }: { label: string }) {
  return (
    <div className="loading">
      <svg viewBox="0 0 120 60" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
        <path d="M6 44 Q20 10 34 34 T62 30 T90 26 Q104 22 114 40" />
      </svg>
      <p>{label}</p>
    </div>
  );
}
