// /・タブだけの URL・知らない URL を、開くページ (/<tab>/<page>) へ送る。
import { resolveNav } from "@demo-data"

export default defineNuxtRouteMiddleware((to) => {
  const { path } = resolveNav(to.path)
  if (path !== to.path) return navigateTo(path, { replace: true })
})
