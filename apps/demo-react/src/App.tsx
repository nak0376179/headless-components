import { useEffect, useMemo, useState } from "react"
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
import { resolveSlug, tabs } from "./demos/registry"

// ルーターは使わず #slug で切り替える (Vue 版と同じ URL で同じデモが開く)。
// 上位タブの slug (#effects) や知らない slug は resolveSlug が開くデモを決める。
const currentSlug = () => resolveSlug(location.hash.slice(1)).demo.slug

export function App() {
  const [slug, setSlug] = useState(currentSlug)
  const [mode, setMode] = useState<"light" | "dark">(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  )
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode])
  const { tab, demo } = resolveSlug(slug)

  useEffect(() => {
    const onHash = () => setSlug(currentSlug())
    addEventListener("hashchange", onHash)
    return () => removeEventListener("hashchange", onHash)
  }, [])

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
            href={`http://localhost:5211/#${slug}`}
            title="同じコアを Vuetify で包んだ版"
          >
            Vue 版 ↗
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
          onChange={(_, v: string) => (location.hash = v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          {tabs.map((t) => (
            <Tab key={t.slug} value={t.slug} label={t.label} />
          ))}
        </Tabs>
        {tab.children.length > 1 && (
          <Tabs
            value={demo.slug}
            onChange={(_, v: string) => (location.hash = v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2, minHeight: 40, "& .MuiTab-root": { minHeight: 40, py: 0.5 } }}
          >
            {tab.children.map((d) => (
              <Tab key={d.slug} value={d.slug} label={d.label} />
            ))}
          </Tabs>
        )}
      </AppBar>

      <Container maxWidth="lg" sx={{ my: 4 }}>
        <Box key={demo.slug}>{demo.render()}</Box>
      </Container>
    </ThemeProvider>
  )
}
