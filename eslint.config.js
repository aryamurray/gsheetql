import antfu from "@antfu/eslint-config";

export default antfu(
  {
    type: "app",
    typescript: true,
    formatters: true,
    stylistic: {
      indent: 2,
      semi: true,
      quotes: "double",
    },
    jsdoc: false,
  },
  {
    rules: {
      // --- stylistic rules ---
      "style/brace-style": "off",
      "style/arrow-parens": "off",
      "antfu/if-newline": "warn",

      // --- functional rules ---
      "ts/no-redeclare": "off",
      "node/file-extension-in-import": ["error", "always"],
      "ts/consistent-type-definitions": ["error", "type"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "antfu/no-top-level-await": ["off"],
      "node/prefer-global/process": ["off"],
      "node/no-process-env": "off",
      "perfectionist/sort-imports": [
        "error",
        {
          type: "alphabetical",
          order: "asc",
          ignoreCase: true,
          groups: [
            "builtin",
            "external",
            "internal",
            "sibling",
            "parent",
            "index",
          ],
        },
      ],
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase",
          ignore: ["README.md"],
        },
      ],
      "test/prefer-lowercase-title": ["off"],
    },
  },
);
