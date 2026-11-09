import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const mediaHost = process.env.MEDIA_PUBLIC_HOST; // e.g. media.example.com (R2 custom domain) — pending approval

// Docker image builds set NEXT_OUTPUT=standalone (self-contained server.js + traced node_modules).
// Plain `next build && next start` (non-Docker hosting) is unchanged.
const standalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(standalone ? { output: "standalone" as const, outputFileTracingRoot: path.resolve(process.cwd(), "../..") } : {}),
  poweredByHeader: false,
  transpilePackages: ["@saudi-ecom/contracts"],
  serverExternalPackages: ["pg", "bcryptjs", "nodemailer"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaHost ? [{ protocol: "https", hostname: mediaHost }] : [],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/(admin|account|checkout|cart|wishlist|auth)(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;
