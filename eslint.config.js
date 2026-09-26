import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"
import pluginVue from "eslint-plugin-vue"
import reactHooks from "eslint-plugin-react-hooks"

export default tseslint.config(
  { ignores: ["**/dist", "**/node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  // React のフックの規則は React 側のパッケージだけに掛ける。
  {
    files: ["packages/react/**/*.{ts,tsx}", "packages/mui/**/*.tsx", "apps/demo-react/**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  // Vue SFC は eslint-plugin-vue の flat config でパースし、<script lang="ts"> は typescript-eslint に委ねる。
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: { globals: globals.browser, parserOptions: { parser: tseslint.parser } },
    // コンポーネント名は MUI 版とそろえる (Pixelate のように 1 語のものがある)。
    rules: { "vue/multi-word-component-names": "off" },
  },
  // コアはフレームワーク非依存を保つ。
  {
    files: ["packages/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["react", "react-*", "vue", "vuetify", "@mui/*", "@hc/react", "@hc/vue"] },
      ],
    },
  },
  // スタイル（改行・セミコロンなど）は Prettier に任せる。
  eslintConfigPrettier,
)
