import React, { type ComponentType } from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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

const router = createBrowserRouter(
  [{ Component: DemoLayout, children: [...pageRoutes, { path: "*", Component: Fallback }] }],
  // 置き場のパス (vite の base。nak-portal なら /admin/web/hc-react/) の下で動かす
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
)

// サーバーページネーション・無限スクロールの取得とキャッシュ (utils の部品も useAppQueryClient でこれを使う)。
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
