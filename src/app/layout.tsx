import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "与历史心理学家对话",
  description: "面向心理学教育和角色模拟的历史心理学家对话工具"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
