import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n-request.ts");

const nextConfig: NextConfig = {
  // Verification builds use NEXT_DIST_DIR=.next-verify so they never overwrite the .next/ a running `npm run dev` reads.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default withNextIntl(nextConfig);
