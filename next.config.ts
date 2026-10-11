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
    // Visited and prefetched pages stay in the client cache for 30 s, so links
    // (src/components/ui/link.tsx prefetches them) open without waiting for the server.
    // Account actions call revalidatePath() after a change, which clears this cache (T17).
    staleTimes: { dynamic: 30, static: 30 },
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
