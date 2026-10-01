import { useEffect, useState } from "react"
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Rating,
  Skeleton,
  Stack,
  Switch,
  Typography,
} from "@mui/material"
import FavoriteIcon from "@mui/icons-material/Favorite"
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import TrendingDownIcon from "@mui/icons-material/TrendingDown"
import ShoppingCartIcon from "@mui/icons-material/AddShoppingCart"
import RefreshIcon from "@mui/icons-material/Refresh"
import { ARTICLE, KPIS, PRODUCT, PROFILE, SETTINGS, sparklinePath } from "@demo-data"

const yen = (n: number) => `¥${n.toLocaleString()}`

export default function CardPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        よく使うカードの型。画像の代わりにグラデーションと絵文字を使っている。
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ProfileCard />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Grid container spacing={2}>
            {KPIS.map((k) => (
              <Grid key={k.label} size={{ xs: 12, sm: 4 }}>
                <KpiCard {...k} />
              </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 6 }}>
              <ProductCard />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SettingsCard />
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <ArticleCard />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SkeletonCard />
        </Grid>
      </Grid>
    </Stack>
  )
}

/** プロフィール: 帯の上にアバターを重ね、フォローを切り替える。 */
function ProfileCard() {
  const [following, setFollowing] = useState(false)
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <Box sx={{ height: 88, background: `linear-gradient(120deg, ${PROFILE.color}, #00c2ff)` }} />
      <CardContent sx={{ textAlign: "center", mt: -7 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          variant="dot"
          color="success"
        >
          <Avatar
            sx={{
              width: 88,
              height: 88,
              mx: "auto",
              fontSize: 36,
              bgcolor: PROFILE.color,
              border: 4,
              borderColor: "background.paper",
            }}
          >
            {PROFILE.initials}
          </Avatar>
        </Badge>
        <Typography variant="h6" sx={{ mt: 1 }}>
          {PROFILE.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {PROFILE.role}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          {PROFILE.bio}
        </Typography>
        <Stack
          direction="row"
          divider={<Divider orientation="vertical" flexItem />}
          sx={{ mt: 2, justifyContent: "center" }}
        >
          {PROFILE.stats.map((s) => (
            <Box key={s.label} sx={{ px: 2 }}>
              <Typography variant="h6">{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button
          variant={following ? "outlined" : "contained"}
          onClick={() => setFollowing((f) => !f)}
          sx={{ borderRadius: 999, px: 4 }}
        >
          {following ? "フォロー中" : "フォローする"}
        </Button>
      </CardActions>
    </Card>
  )
}

/** 数値: 前月比の矢印とミニグラフ。 */
function KpiCard({ label, value, delta, color, series }: (typeof KPIS)[number]) {
  const up = delta >= 0
  // 解約率は下がる方が良い
  const good = label === "解約率" ? !up : up
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color }}>
          {value}
        </Typography>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "center", color: good ? "success.main" : "error.main" }}
        >
          {up ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
          <Typography variant="caption">
            {up ? "+" : ""}
            {delta}% 前月比
          </Typography>
        </Stack>
        <svg viewBox="0 0 120 36" width="100%" height="36" style={{ marginTop: 8 }} aria-hidden>
          <path d={`${sparklinePath(series)} L120,36 L0,36 Z`} fill={`${color}22`} />
          <path d={sparklinePath(series)} fill="none" stroke={color} strokeWidth="2" />
        </svg>
      </CardContent>
    </Card>
  )
}

/** 商品: バッジ・評価・お気に入り・カートに入れる。 */
function ProductCard() {
  const [fav, setFav] = useState(false)
  const [inCart, setInCart] = useState(0)
  return (
    <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          position: "relative",
          height: 120,
          background: PRODUCT.gradient,
          display: "grid",
          placeItems: "center",
          fontSize: 56,
        }}
      >
        {PRODUCT.emoji}
        <Chip
          label={PRODUCT.badge}
          color="error"
          size="small"
          sx={{ position: "absolute", top: 8, left: 8, fontWeight: 700 }}
        />
        <IconButton
          onClick={() => setFav((f) => !f)}
          aria-label="お気に入り"
          sx={{ position: "absolute", top: 4, right: 4, color: fav ? "error.main" : "#fff" }}
        >
          {fav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </IconButton>
      </Box>
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {PRODUCT.name}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Rating value={PRODUCT.rating} precision={0.1} size="small" readOnly />
          <Typography variant="caption" color="text.secondary">
            {PRODUCT.rating} ({PRODUCT.reviews})
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", mt: 1 }}>
          <Typography variant="h6" color="error.main" sx={{ fontWeight: 700 }}>
            {yen(PRODUCT.price)}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textDecoration: "line-through" }}
          >
            {yen(PRODUCT.listPrice)}
          </Typography>
        </Stack>
      </CardContent>
      <CardActions>
        <Button
          fullWidth
          variant="contained"
          startIcon={<ShoppingCartIcon />}
          onClick={() => setInCart((n) => n + 1)}
        >
          {inCart ? `カートに入れる (${inCart})` : "カートに入れる"}
        </Button>
      </CardActions>
    </Card>
  )
}

/** 設定: スイッチの一覧。 */
function SettingsCard() {
  const [on, setOn] = useState<Record<string, boolean>>({ mail: true, push: false, weekly: true })
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardHeader
        title="通知の設定"
        subheader={`${Object.values(on).filter(Boolean).length} / ${SETTINGS.length} 件オン`}
      />
      <List dense disablePadding>
        {SETTINGS.map((s) => (
          <ListItem
            key={s.key}
            secondaryAction={
              <Switch
                edge="end"
                checked={on[s.key]}
                onChange={(e) => setOn({ ...on, [s.key]: e.target.checked })}
              />
            }
          >
            <ListItemIcon sx={{ fontSize: 22, minWidth: 40 }}>{s.icon}</ListItemIcon>
            <ListItemText primary={s.label} secondary={s.note} />
          </ListItem>
        ))}
      </List>
    </Card>
  )
}

/** 記事: 見出し画像・タグ・続きを読む (開閉)。 */
function ArticleCard() {
  const [open, setOpen] = useState(false)
  return (
    <Card variant="outlined">
      <Stack direction={{ xs: "column", sm: "row" }}>
        <Box
          sx={{
            minWidth: { sm: 200 },
            minHeight: 140,
            background: ARTICLE.gradient,
            display: "grid",
            placeItems: "center",
            fontSize: 64,
          }}
        >
          {ARTICLE.emoji}
        </Box>
        <Box sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="primary">
              {ARTICLE.category}
            </Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.4 }}>
              {ARTICLE.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {ARTICLE.date} ・ {ARTICLE.readMin} 分で読める
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {ARTICLE.summary}
            </Typography>
            <Collapse in={open}>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {ARTICLE.body}
              </Typography>
            </Collapse>
          </CardContent>
          <CardActions>
            {ARTICLE.tags.map((t) => (
              <Chip key={t} label={`#${t}`} size="small" variant="outlined" />
            ))}
            <Box sx={{ flex: 1 }} />
            <Button
              onClick={() => setOpen((o) => !o)}
              endIcon={
                <ExpandMoreIcon
                  sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}
                />
              }
            >
              {open ? "閉じる" : "続きを読む"}
            </Button>
          </CardActions>
        </Box>
      </Stack>
    </Card>
  )
}

/** 読み込み中: 骨組み (スケルトン) を出してから中身に差し替える。 */
function SkeletonCard() {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => setLoading(false), 1500)
    return () => clearTimeout(t)
  }, [loading])
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardHeader
        avatar={
          loading ? (
            <Skeleton variant="circular" width={40} height={40} />
          ) : (
            <Avatar sx={{ bgcolor: "#0a9396" }}>田</Avatar>
          )
        }
        title={loading ? <Skeleton width="60%" /> : "田中 一郎"}
        subheader={loading ? <Skeleton width="40%" /> : "3 分前"}
        action={
          <IconButton onClick={() => setLoading(true)} aria-label="読み直す" disabled={loading}>
            <RefreshIcon />
          </IconButton>
        }
      />
      {loading ? (
        <Skeleton variant="rectangular" height={96} />
      ) : (
        <Box
          sx={{
            height: 96,
            background: "linear-gradient(120deg,#0a9396,#94d2bd)",
            display: "grid",
            placeItems: "center",
            fontSize: 40,
          }}
        >
          🌿
        </Box>
      )}
      <CardContent>
        {loading ? (
          <>
            <Skeleton />
            <Skeleton width="80%" />
          </>
        ) : (
          <Typography variant="body2">
            新しい観葉植物を迎えました。読み込み中は骨組みを出し、届いたら差し替えます
            (右上で読み直し)。
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
