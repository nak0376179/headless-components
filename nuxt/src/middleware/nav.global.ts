// /・タブだけの URL・知らない URL を、開くページ (/<tab>/<page>) へ送る。
// 旧版のブックマーク (/#slug) はハッシュの方で決める (送り先にハッシュは付けない)。
import { resolveNav } from "@demo-data"

export default defineNuxtRouteMiddleware((to) => {
  const { path } = resolveNav(to.path === "/" && to.hash ? to.hash : to.path)
  if (path !== to.path) return navigateTo(path, { replace: true })
})
