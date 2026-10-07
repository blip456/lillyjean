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
