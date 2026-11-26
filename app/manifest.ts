import type { MetadataRoute } from "next";

// 폰 홈 화면에 "앱처럼" 설치할 때 쓰는 정보예요. (색은 디자인시스템의 brand / surface)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "오늘도 안녕",
    short_name: "오늘도 안녕",
    description: "이웃과 안부를 나누고, 급할 때 도움을 부르는 서비스",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f8f2",
    theme_color: "#1f7a4d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
