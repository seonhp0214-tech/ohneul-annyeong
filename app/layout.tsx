import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "오늘도 안녕",
  description: "이웃과 안부를 나누고, 급할 때 도움을 부르는 서비스",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" }, // 브라우저 탭·아이폰 홈 화면 아이콘
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f7a4d" },
    { media: "(prefers-color-scheme: dark)", color: "#14201a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // 아이폰 아래 홈 바 영역까지 화면을 쓰고, 여백은 직접 조절해요.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* 디자인시스템 글꼴: Noto Sans KR */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 앱 전체(app 폴더)의 공통 화면이라 모든 페이지에 적용돼요. 아래 경고는 pages 폴더용 규칙이라 끕니다. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&display=swap"
        />
      </head>
      <body className="min-h-full bg-surface text-ink">{children}</body>
    </html>
  );
}
