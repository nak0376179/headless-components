import { useState } from "react"
import {
  Button,
  Card,
  CardActionArea,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"
import AddIcon from "@mui/icons-material/PlaylistAdd"
import { countBetween } from "@core"
import { useForm } from "@/hooks/useForm"
import { PLANS } from "@demo-data"
import { FormShell, fakeSave } from "@/demo/FormShell"

type Billing = "monthly" | "yearly"
type Entry = { plan: string; billing: Billing }
type Values = { plan: string; billing: Billing; list: Entry[] }
const initial: Values = { plan: "free", billing: "monthly", list: [] }
const planLabel = (v: string) => PLANS.find((p) => p.value === v)?.label ?? v
const BILLING_LABEL: Record<Billing, string> = { monthly: "月払い", yearly: "年払い" }
const MAX = 5

export default function RadioPage() {
  const [saved, setSaved] = useState<Values | null>(null)
  const { state, controller: form } = useForm<Values>({
    initial,
    rules: {
      list: countBetween(1, MAX, `「リストに保存」で 1〜${MAX} 件ためてから送信してください`),
    },
    onSubmit: async (v) => {
      await fakeSave()
      setSaved(v)
    },
  })
  const { plan, billing, list } = state.values
  const already = list.some((e) => e.plan === plan && e.billing === billing)

  return (
    <FormShell
      title="🔘 ラジオボタン"
      description="ラジオで 1 つ選び、「リストに保存」で選んだ組み合わせを一覧にためる (同じ組み合わせは 1 回だけ)。送信するとその一覧を送る。"
      form={form}
      state={state}
      saved={saved}
    >
      <FormControl>
        <FormLabel>プラン (カード型のラジオ)</FormLabel>
        <RadioGroup row value={plan} onChange={(e) => form.setValue("plan", e.target.value)}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ mt: 1, width: "100%" }}
          >
            {PLANS.map((p) => (
              <Card
                key={p.value}
                variant="outlined"
                sx={{
                  flex: 1,
                  borderColor: plan === p.value ? "primary.main" : undefined,
                  borderWidth: plan === p.value ? 2 : 1,
                }}
              >
                <CardActionArea onClick={() => form.setValue("plan", p.value)} sx={{ p: 1.5 }}>
                  <FormControlLabel
                    value={p.value}
                    control={<Radio />}
                    label={<strong>{p.label}</strong>}
                  />
                  <Typography variant="h6">{p.price}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.note}
                  </Typography>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        </RadioGroup>
      </FormControl>

      <FormControl>
        <FormLabel>支払い</FormLabel>
        <RadioGroup
          row
          value={billing}
          onChange={(e) => form.setValue("billing", e.target.value as Billing)}
        >
          {(Object.keys(BILLING_LABEL) as Billing[]).map((b) => (
            <FormControlLabel key={b} value={b} control={<Radio />} label={BILLING_LABEL[b]} />
          ))}
        </RadioGroup>
      </FormControl>

      <div>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={already || list.length >= MAX}
          onClick={() => {
            form.setValue("list", [...list, { plan, billing }])
            form.touch("list")
          }}
        >
          {already ? "保存済み" : "リストに保存"}
        </Button>
        <FormControl error={form.fieldError("list") !== null} fullWidth>
          <List dense sx={{ mt: 1, border: 1, borderColor: "divider", borderRadius: 1 }}>
            {list.length === 0 && (
              <ListItem>
                <ListItemText secondary="まだありません" />
              </ListItem>
            )}
            {list.map((e, i) => (
              <ListItem
                key={`${e.plan}-${e.billing}`}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="削除"
                    onClick={() =>
                      form.setValue(
                        "list",
                        list.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${i + 1}. ${planLabel(e.plan)}`}
                  secondary={BILLING_LABEL[e.billing]}
                />
              </ListItem>
            ))}
          </List>
          <FormHelperText>{form.fieldError("list") ?? `${list.length} / ${MAX} 件`}</FormHelperText>
        </FormControl>
      </div>
    </FormShell>
  )
}
