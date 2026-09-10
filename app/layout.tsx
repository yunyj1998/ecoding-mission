import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "디코딩 미션 | 팀 커뮤니케이션 워크숍",
  description: "강사와 팀이 함께하는 실시간 협력 해독 워크숍",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}

