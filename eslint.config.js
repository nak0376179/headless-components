import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"
import pluginVue from "eslint-plugin-vue"
import reactHooks from "eslint-plugin-react-hooks"

export default tseslint.config(
  { ignores: ["**/dist", "**/node_modules", "**/.nuxt", "**/.output"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  // React のフックの規則は React 版だけに掛ける。
  {
    files: ["react/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  // Vue SFC は eslint-plugin-vue の flat config でパースし、<script lang="ts"> は typescript-eslint に委ねる。
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: { globals: globals.browser, parserOptions: { parser: tseslint.parser } },
    // コンポーネント名は MUI 版とそろえる (Pixelate のように 1 語のものがある)。Nuxt のページ名も 1 語。
    rules: { "vue/multi-word-component-names": "off" },
  },
  // core はフレームワーク非依存を保つ。
  {
    files: ["core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["react", "react-*", "vue", "vuetify", "@mui/*", "nuxt", "#*", "@/*"] },
      ],
    },
  },
  // 部品 (取り込み対象) はデモ専用のコード・データを参照しない (vendor でコピーした先に無い)。
  {
    files: [
      "react/src/components/**/*.{ts,tsx}",
      "react/src/hooks/**/*.ts",
      "nuxt/src/components/**/*.{ts,vue}",
      "nuxt/src/composables/**/*.ts",
    ],
    ignores: ["**/*.test.*"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["@demo-data", "@/demo/*", "@/pages/*", "@/layouts/*", "#imports", "#app"] },
      ],
    },
  },
  // スタイル（改行・セミコロンなど）は Prettier に任せる。
  eslintConfigPrettier,
)
