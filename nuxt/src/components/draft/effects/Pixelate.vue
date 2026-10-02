<script setup lang="ts">
// 任意のページをラップし、SVG のモザイクフィルタを通して描画する (Vuetify)。
// ポインター下は円形のレンズで鮮明な元の表示が見える。
// フィルタ生成・ポインター追跡・露出の切り替えは @/utils の createPixelate が持ち、
// ここは中身 (default スロット) を 2 つ (モザイク用 / レンズ用) 描いて、操作バーを出すだけ。
import { computed, ref, watch } from "vue"
import { useMounted } from "@/composables/draft/useMounted"
import { useStore } from "@/composables/useStore"
import { createPixelate, PIXELATE_MAX_SIZE, PIXELATE_MIN_SIZE } from "@/utils/draft"

const props = withDefaults(
  defineProps<{
    /** モザイクのブロックサイズ（px）。大きいほど粗くなる。 */
    size?: number
    /** 効果をオフにする（中身は通常どおり描画される）。 */
    active?: boolean
    /** ポインター下に鮮明な円を露わにする。 */
    lens?: boolean
    /** 露出レンズの半径（px）。 */
    lensRadius?: number
    /** フローティングの操作バー（ブロックサイズのスライダー / 露出トグル）を表示する。 */
    controls?: boolean
  }>(),
  { size: 14, active: true, lens: true, lensRadius: 90, controls: true },
)

const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const lensEl = ref<HTMLElement | null>(null)

// active の切り替えで作りなおす (false なら作らない = 中身がそのまま描かれる)。
const controller = useMounted(() => {
  if (!props.active || !root.value || !content.value || !lensEl.value) return null
  return createPixelate(
    { root: root.value, content: content.value, lens: lensEl.value },
    { size: props.size, lens: props.lens, lensRadius: props.lensRadius },
  )
}, [() => props.active])
const state = useStore(controller)

watch(
  () => props.size,
  (s) => controller.value?.setSize(s),
)
watch(
  () => props.lens,
  (l) => controller.value?.setLensEnabled(l),
)
watch(
  () => props.lensRadius,
  (r) => controller.value?.setLensRadius(r),
)

const revealed = computed(() => state.value?.revealed ?? false)
const blockSize = computed({
  get: () => state.value?.size ?? props.size,
  set: (v: number) => controller.value?.setSize(v),
})
</script>

<template>
  <!-- active=false でも外枠は残す (素の div なので見た目は中身だけと同じ)。
       要素が消えないので、active の切り替えでコントローラを作りなおしても参照がずれない。 -->
  <div ref="root">
    <div ref="content"><slot /></div>
    <!-- レンズ用のコピー。表示・クリップはコアが切り替える (マウント前は隠しておく)。 -->
    <div ref="lensEl" aria-hidden="true" style="display: none"><slot v-if="active" /></div>

    <div v-if="active && controls" class="pixelate-controls">
      <label class="pixelate-controls__size">
        🟦
        <v-slider
          v-model="blockSize"
          :min="PIXELATE_MIN_SIZE"
          :max="PIXELATE_MAX_SIZE"
          :step="1"
          :disabled="revealed"
          aria-label="ブロックサイズ"
          color="white"
          theme="dark"
          density="compact"
          hide-details
          style="width: 120px"
        />
      </label>
      <v-btn
        size="small"
        rounded="pill"
        variant="flat"
        :color="revealed ? '#e8543f' : '#2d8f5a'"
        class="pixelate-controls__toggle"
        @click="controller?.toggleRevealed()"
      >
        {{ revealed ? "🟦 モザイク" : "👓 解除" }}
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.pixelate-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10001;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(20, 20, 30, 0.7);
  color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
}
.pixelate-controls__size {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pixelate-controls__toggle {
  font-weight: 700;
  font-size: 13px;
  text-transform: none;
  letter-spacing: normal;
}
</style>
