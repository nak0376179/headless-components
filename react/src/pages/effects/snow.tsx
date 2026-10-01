import { useRef, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { Snowfall } from "@/components/effects/Snowfall"
import { useForm } from "@/hooks/useForm"
import { email, required, whenFilled, type SnowfallController } from "@core"

const STARS = Array.from({ length: 60 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 55}%`,
  size: 1 + ((i * 7) % 3),
  delay: `${(i % 7) * 0.4}s`,
}))

/** 冬の夜のログイン画面。ダイアログ (data-snow-target) の上に雪が積もり、ログインを押すと揺れて落ちる。 */
export default function SnowPage() {
  const snow = useRef<SnowfallController | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const [shaking, setShaking] = useState(false)
  const [welcome, setWelcome] = useState<string | null>(null)
  const { state, controller: form } = useForm({
    initial: { email: "", password: "", remember: true },
    rules: {
      email: [required("メールアドレスを入力してください"), whenFilled(email())],
      password: (v) => (v.length >= 4 ? null : "4 文字以上で入力してください"),
    },
    onSubmit: async (v) => {
      await new Promise((r) => setTimeout(r, 700))
      setWelcome(v.email)
    },
  })

  const shakeOff = () => {
    // ダイアログを揺らして、積もった雪を払い落とす
    setShaking(true)
    if (card.current) snow.current?.shake(card.current)
    setTimeout(() => setShaking(false), 500)
  }

  return (
    <Snowfall controllerRef={snow} intensity={90} wind={18}>
      <Box
        sx={{
          position: "relative",
          minHeight: 640,
          overflow: "hidden",
          color: "#e8eefc",
          background: "linear-gradient(180deg,#0b1026 0%,#1b2350 55%,#3a3f78 100%)",
          fontFamily: "system-ui, sans-serif",
          "@keyframes twinkle": { "0%,100%": { opacity: 0.3 }, "50%": { opacity: 1 } },
          "@keyframes hc-shake": {
            "0%,100%": { transform: "translateX(0)" },
            "20%": { transform: "translateX(-10px) rotate(-1deg)" },
            "40%": { transform: "translateX(9px) rotate(1deg)" },
            "60%": { transform: "translateX(-6px)" },
            "80%": { transform: "translateX(4px)" },
          },
        }}
      >
        {/* 星 */}
        {STARS.map((s, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              left: s.left,
              top: s.top,
              width: `${s.size}px`, // ⚠ 数値の 1 は MUI では「100%」になる
              height: `${s.size}px`,
              borderRadius: "50%",
              bgcolor: "#fff",
              animation: `twinkle 3s ${s.delay} infinite`,
            }}
          />
        ))}
        {/* 上のナビ (ここにも積もる) */}
        <Box
          data-snow-target
          sx={{
            position: "relative",
            mx: 3,
            mt: 3,
            px: 3,
            py: 1.5,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <Typography sx={{ fontWeight: 800, letterSpacing: 1 }}>❄️ Acme Cloud</Typography>
          <Box sx={{ flex: 1 }} />
          {["製品", "料金", "ドキュメント"].map((t) => (
            <Typography key={t} variant="body2" sx={{ opacity: 0.8 }}>
              {t}
            </Typography>
          ))}
        </Box>
        {/* 山の影絵 */}
        <Box
          component="svg"
          viewBox="0 0 1200 220"
          preserveAspectRatio="none"
          sx={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 200 }}
        >
          <path
            d="M0 220 L0 140 L160 60 L300 150 L440 40 L620 160 L760 70 L920 150 L1060 50 L1200 130 L1200 220 Z"
            fill="#141a3c"
          />
          <path
            d="M0 220 L0 180 L220 110 L380 190 L560 120 L760 200 L960 120 L1200 190 L1200 220 Z"
            fill="#0d1230"
          />
        </Box>

        {/* ログインのダイアログ (data-snow-target で上の縁に積もる) */}
        <Box sx={{ position: "relative", display: "grid", placeItems: "center", py: 7 }}>
          <Box
            ref={card}
            data-snow-target
            sx={{
              width: 380,
              maxWidth: "calc(100% - 32px)",
              p: 4,
              borderRadius: 3,
              color: "#1c2033",
              bgcolor: "rgba(255,255,255,0.96)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
              animation: shaking ? "hc-shake .5s" : undefined,
            }}
          >
            {welcome ? (
              <Stack spacing={2} sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="h3">☃️</Typography>
                <Typography variant="h6">ようこそ</Typography>
                <Typography variant="body2" color="text.secondary">
                  {welcome} でログインしました
                </Typography>
                <Button onClick={() => (setWelcome(null), form.reset())}>ログアウト</Button>
              </Stack>
            ) : (
              <Box
                component="form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  shakeOff()
                  void form.submit()
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 800, textAlign: "center" }}>
                  ログイン
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", mb: 3 }}
                >
                  しばらく放っておくと、ダイアログに雪が積もります
                </Typography>
                <Stack spacing={1}>
                  <TextField
                    label="メールアドレス"
                    value={state.values.email}
                    onChange={(e) => form.setValue("email", e.target.value)}
                    onBlur={() => form.touch("email")}
                    error={form.fieldError("email") !== null}
                    helperText={form.fieldError("email") ?? " "}
                  />
                  <TextField
                    label="パスワード"
                    type="password"
                    value={state.values.password}
                    onChange={(e) => form.setValue("password", e.target.value)}
                    onBlur={() => form.touch("password")}
                    error={form.fieldError("password") !== null}
                    helperText={form.fieldError("password") ?? " "}
                  />
                  <FormControlLabel
                    label="ログインしたままにする"
                    control={
                      <Checkbox
                        checked={state.values.remember}
                        onChange={(e) => form.setValue("remember", e.target.checked)}
                      />
                    }
                  />
                  {state.submitError && <Alert severity="error">{state.submitError}</Alert>}
                  <Button type="submit" variant="contained" size="large" loading={state.submitting}>
                    ログイン (雪を払う)
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Snowfall>
  )
}
