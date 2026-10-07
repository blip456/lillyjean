/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Scopes are optional, but when used they must come from this list.
    "scope-enum": [
      2,
      "always",
      [
        "auth",
        "home",
        "books",
        "readlists",
        "challenges",
        "clubs",
        "profile",
        "ui",
        "i18n",
        "db",
        "api",
        "ci",
        "deps",
        "release",
        "docs",
      ],
    ],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "body-max-line-length": [1, "always", 100],
  },
};

export default config;
