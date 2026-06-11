import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "電子契約システム",
  description: "入居契約・訪問介護利用契約などの電子契約・電子署名を管理",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
