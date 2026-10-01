import { useMemo, useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router"
import {
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
            href={`http://localhost:5211${pathname}`}
            title="同じ core を Nuxt + Vuetify で包んだ版"
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
          {NAV.map((t) => (
            <Tab key={t.slug} value={t.slug} label={t.label} />
          ))}
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
        <Box key={pathname}>
          <Outlet />
        </Box>
        <UsageSection key={`usage-${page.slug}`} slug={page.slug} />
      </Container>
    </ThemeProvider>
  )
}
