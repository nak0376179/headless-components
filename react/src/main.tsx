import React, { type ComponentType } from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from "react-router"
import { NAV, navPath, resolveNav } from "@demo-data"
import { DemoLayout } from "@/layouts/DemoLayout"

// pages/<tab>/<page>.tsx を Nuxt と同じ URL (/<tab>/<page>) に割り当てる。
// 並び・名前は @demo-data の NAV が正 (Nuxt 版と共用)。NAV にあってファイルが無ければ起動時に落とす。
const files = import.meta.glob<{ default: ComponentType }>("./pages/*/*.tsx", { eager: true })
const pageRoutes = NAV.flatMap((tab) =>
  tab.pages.map((page) => {
    const file = files[`./pages/${tab.slug}/${page.slug}.tsx`]
    if (!file) throw new Error(`pages/${tab.slug}/${page.slug}.tsx がありません`)
    return { path: navPath(tab, page), Component: file.default }
  }),
)

/** /・タブだけの URL・旧版の #slug を、開くページへ送る。 */
function Fallback() {
  const { pathname, hash } = useLocation()
  return <Navigate to={resolveNav(hash || pathname).path} replace />
}

const router = createBrowserRouter([
  { Component: DemoLayout, children: [...pageRoutes, { path: "*", Component: Fallback }] },
])

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
