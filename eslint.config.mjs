import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Formatting is Prettier's job; turn off stylistic rules that would conflict.
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Links prefetch the full page and show a progress bar via our wrapper (T17).
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              importNames: ["default"],
              message: "Use { Link } from @/components/ui/link (T17).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/ui/link.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // Standalone Node scripts (CommonJS, report to the console).
    files: ["e2e/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/**",
    "src/lib/supabase/database.types.ts",
    "docs/**",
  ]),
]);

export default eslintConfig;
