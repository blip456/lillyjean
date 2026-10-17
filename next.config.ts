import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import pkg from "./package.json" with { type: "json" };

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  env: {
    // Single source of truth for the app version: package.json, bumped by release-please.
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // The in-app changelog reads CHANGELOG.md at runtime; ship it with the server bundle.
  outputFileTracingIncludes: {
    "/changelog": ["./CHANGELOG.md"],
    // What's coming reads the sprint plan at runtime.
    "/whats-coming": ["./docs/backlog.md"],
  },
  experimental: {
    // Visited pages stay in the client cache for 30 s; prefetched pages (every link prefetches,
    // src/components/ui/link.tsx) for the default 5 minutes, so a tap opens the next screen from
    // the cache even after reading a page for a while or when the server has gone cold. Every
    // action that changes data calls revalidatePath(), which clears this cache (T17, T21).
    staleTimes: { dynamic: 30 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
