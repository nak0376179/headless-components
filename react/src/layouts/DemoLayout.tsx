import { useMemo, useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router"
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  IconButton,
  Tab,
  Tabs,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import LightModeIcon from "@mui/icons-material/LightMode"
import { NAV, navPath, resolveNav } from "@demo-data"
import { UsageSection } from "@/demo/usage/UsageSection"

// もう一方 (Nuxt 版) の URL。公開するときはビルド時に VITE_NUXT_URL で差し替える (scripts/portal-build.mjs)。
const NUXT_URL = import.meta.env.VITE_NUXT_URL ?? "http://localhost:5211"

// デモ全体の枠 (タイトル・上位タブ・小タブ・コードの使い方)。ページは <Outlet /> に入る。
// URL は Nuxt 版と同じ /<tab>/<page> なので、「Nuxt 版」のリンクは同じパスを開くだけ。
export function DemoLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<"light" | "dark">(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  )
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode])
  const { tab, page } = resolveNav(pathname)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🧩 headless-components — React + MUI
          </Typography>
          <Button
            size="small"
            href={`${NUXT_URL}${pathname}`}
            title="同じ utils を Nuxt + Vuetify で包んだ版"
          >
            Nuxt 版 ↗
          </Button>
          <IconButton
            onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
            color="inherit"
            aria-label="テーマ切り替え"
          >
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Toolbar>
        <Tabs
          value={tab.slug}
          onChange={(_, v: string) => navigate(resolveNav(v).path)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          {NAV.flatMap((t, i) => [
            // main と draft の境目に見出しを置く (押せない)
            ...(t.draft && !NAV[i - 1]?.draft
              ? [<Tab key="draft-label" disabled label="🧪 Draft" sx={{ minWidth: 0, px: 1 }} />]
              : []),
            <Tab
              key={t.slug}
              value={t.slug}
              label={t.label}
              sx={t.draft ? { opacity: 0.75, fontWeight: 400 } : { fontWeight: 600 }}
            />,
          ])}
        </Tabs>
        {tab.pages.length > 1 && (
          <Tabs
            value={page.slug}
            onChange={(_, v: string) => navigate(navPath(tab, { slug: v, label: "" }))}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2, minHeight: 40, "& .MuiTab-root": { minHeight: 40, py: 0.5 } }}
          >
            {tab.pages.map((p) => (
              <Tab key={p.slug} value={p.slug} label={p.label} />
            ))}
          </Tabs>
        )}
      </AppBar>

      <Container maxWidth="lg" sx={{ my: 4 }}>
        {tab.draft && (
          <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
            🧪 Draft — main (CSV/TSV → JSON・データテーブル) 以外の試作。仕様は変わりうるし、pnpm
            vendor の既定では取り込まない (--draft で取り込む)。
          </Alert>
        )}
        <Box key={pathname}>
          <Outlet />
        </Box>
        <UsageSection key={`usage-${page.slug}`} slug={page.slug} />
      </Container>
    </ThemeProvider>
  )
}
