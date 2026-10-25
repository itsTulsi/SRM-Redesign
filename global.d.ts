import type messages from "./messages/en.json";
import type { routing } from "./lib/i18n";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
