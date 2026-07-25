import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk to me",
  description: "对话过去的声音，靠近此刻的自己"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Link className="sr-only" href="/about">
          安全与隐私说明
        </Link>
        {children}
      </body>
    </html>
  );
}
