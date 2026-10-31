import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n-request.ts");

const nextConfig: NextConfig = {
  // Verification builds use NEXT_DIST_DIR=.next-verify so they never overwrite the .next/ a running `npm run dev` reads.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep metadata in <head> for everyone, including on /compare, the one dynamic page, where Next would otherwise stream it into <body>.
  htmlLimitedBots: /.*/,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // srmist.edu.in's firewall answers visits referred from another site with a "confirm you are human" check (405), then
  // 403 Forbidden, so links out send no referrer. The YouTube embeds opt back in: YouTube won't play without one.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Referrer-Policy", value: "same-origin" }] }];
  },
};

export default withNextIntl(nextConfig);
