/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  root: true,
  extends: [
    "plugin:vue/vue3-essential",
    "plugin:vue/vue3-strongly-recommended",
    "plugin:vue/vue3-recommended",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "@vue/eslint-config-typescript",
    "@vue/eslint-config-prettier/skip-formatting",
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    ecmaVersion: "latest",
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname,
    parser: "@typescript-eslint/parser",
  },
  rules: {
    "no-trailing-spaces": "off",
    "no-unsafe-optional-chaining": "off",
    "no-empty": ["error", { "allowEmptyCatch": true }],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unsafe": 'off',
    "@typescript-eslint/no-unsafe-return": 'off',
    "@typescript-eslint/no-unsafe-assignment": 'off',
    "@typescript-eslint/no-unsafe-call": 'off',
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_+$",
      },
    ],
  },
  ignorePatterns: ["/*", "!/src"],
};