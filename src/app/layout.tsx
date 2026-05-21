import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeetAI | 회의록 자동 생성 MVP",
  description: "OpenAI와 Notion API 기반 회의록 자동 생성 MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
