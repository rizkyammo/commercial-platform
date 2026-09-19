import nextConfig from "eslint-config-next";

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "*.config.js",
      "*.config.ts",
      "*.config.mjs",
      "playwright.config.ts",
      "vitest.config.ts",
      "postcss.config.mjs",
      "tailwind.config.ts",
    ],
  },

  ...nextConfig,

  {
    rules: {
      // ============================================
      // DOWNGRADE TO WARNINGS (React 19 new rules)
      // ============================================
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/unsupported-syntax": "warn",
      "react-hooks/incompatible-library": "warn",

      // ============================================
      // DOWNGRADE TO WARNINGS
      // ============================================
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          args: "after-used",
        },
      ],
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "off",
      "@next/next/no-location-assign-relative-destination": "warn",
      "react/no-unescaped-entities": "off",
      "prefer-const": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-empty-interface": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "no-empty": "warn",
      "no-constant-condition": "warn",
      "jsx-a11y/alt-text": "warn",

      // Turn off rules yang terlalu strict untuk project ini
      "react-hooks/rules-of-hooks": "error", // penting — keep as error
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-function-type": "warn",
    },
  },
];

export default config;