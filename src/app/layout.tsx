import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "与历史心理学家对话",
  description: "面向心理学教育和角色模拟的历史心理学家对话工具。"
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
            <Link href="/experts">选择专家</Link>
            <Link href="/about">安全与隐私说明</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <Link href="/about">安全与隐私说明</Link>
          <span>教育性角色模拟，不提供临床服务。</span>
        </footer>
      </body>
    </html>
  );
}
