import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk to me",
  description: "对话过去的声音，靠近此刻的自己。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <nav aria-label="主导航" className="site-nav">
            <Link href="/">首页</Link>
            <Link href="/about">安全与隐私说明</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <Link href="/about">安全与隐私说明</Link>
          <span>Talk to me</span>
        </footer>
      </body>
    </html>
  );
}
