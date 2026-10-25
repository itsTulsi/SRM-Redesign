import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and any path with a file extension (images, video, fonts).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
