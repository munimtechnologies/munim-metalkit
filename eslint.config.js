// ESLint 10 flat config. `@react-native/eslint-config` only supports ESLint 8/9 (eslintrc), so
// this composes the same checks that matter here from their sources: typescript-eslint,
// react-hooks and prettier (formatting is enforced through `prettier/prettier`).
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const reactHooks = require("eslint-plugin-react-hooks");
const prettierRecommended = require("eslint-plugin-prettier/recommended");
const globals = require("globals");

module.exports = tseslint.config(
  {
    ignores: [
      "lib/**",
      "nitrogen/generated/**",
      "**/node_modules/**",
      "example/ios/**",
      "example/android/**",
      "example/.expo/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierRecommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "prettier/prettier": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["src/**/*.{ts,tsx}", "example/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, __DEV__: "readonly" },
    },
  },
  {
    files: ["test/**"],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
);
