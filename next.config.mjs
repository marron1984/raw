/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-lib / fontkit をサーバーコンポーネントで利用するための設定
  experimental: {
    serverComponentsExternalPackages: ["@pdf-lib/fontkit", "pdf-lib"],
    // 手書き署名画像（data URL）を Server Action で受け取れるよう上限を引き上げる
    serverActions: {
      bodySizeLimit: "4mb",
    },
    // PDF生成で使う日本語フォントを、Vercelのサーバーレス関数に確実に同梱する
    outputFileTracingIncludes: {
      "/api/contracts/[id]/pdf": ["./src/assets/fonts/**"],
    },
  },
};

export default nextConfig;
