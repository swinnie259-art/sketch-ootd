import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "单品搭 Sketch OOTD",
  description: "上传一件单品，找到搭配它的其他单品、可参考的博主和全网同款 OOTD。",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=ZCOOL+KuaiLe&family=Noto+Sans+SC:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        {/* The wobble that makes every border look hand-inked */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <filter id="rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} />
            <feDisplacementMap in="SourceGraphic" scale={3.2} />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
