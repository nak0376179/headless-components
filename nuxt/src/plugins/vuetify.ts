// Vuetify を Nuxt に組み込む。テーマは OS の設定に合わせる ("system")。
import { createVuetify } from "vuetify"
import * as components from "vuetify/components"
import * as directives from "vuetify/directives"

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(createVuetify({ components, directives, theme: { defaultTheme: "system" } }))
})
