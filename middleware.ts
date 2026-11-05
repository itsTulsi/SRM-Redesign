import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and any path with a file extension (images, video, fonts). Also skip link-preview
  // images: an English page's og:image is /en/…/opengraph-image, and redirecting it to drop /en loses some crawlers.
  matcher: "/((?!api|_next|_vercel|.*\\..*|.*/(?:opengraph|twitter)-image).*)",
};
