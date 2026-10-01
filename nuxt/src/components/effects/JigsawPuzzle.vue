<script setup lang="ts">
// 包んだ内容をジグソーパズルにする演出 (Vuetify)。
// ピースの生成・ドラッグ・スナップ・効果音は @core の createJigsaw が持ち、
// ここは host 構造と操作バー (進捗・シャッフル・そろえる) とクリア表示を描くだけ。
import { ref, watch } from "vue"
import { useMounted } from "@/composables/useMounted"
import { useStore } from "@/composables/useStore"
import { createJigsaw } from "@core"

const props = withDefaults(
  defineProps<{
    /** パズルの行数。 */
    rows?: number
    /** パズルの列数。 */
    cols?: number
    /** 効果のオン/オフ。オフのときスロットの内容は通常どおり描かれる。 */
    active?: boolean
    /** ピースをシャッフルした状態でゲームを開始する。 */
    scattered?: boolean
    /** ユーザーがピースをドラッグできるようにする。 */
    draggable?: boolean
    /** フローティングの操作バー（シャッフル / そろえる / 進捗）を表示する。 */
    controls?: boolean
    /** パズルの切り方を変える。 */
    seed?: number
    /** ピースが定位置にはまったときに合成したクリック音を鳴らす。 */
    sound?: boolean
  }>(),
  {
    rows: 4,
    cols: 6,
    active: true,
    scattered: true,
    draggable: true,
    controls: true,
    seed: 1,
    sound: true,
  },
)
/** solved: すべてのピースが定位置に固定されたときに一度だけ発火する。 */
const emit = defineEmits<{ solved: [] }>()

const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const overlay = ref<HTMLElement | null>(null)

// sound は setSound で切り替えるので作りなおしの対象にしない (パズルがばらけ直さないように)。
const controller = useMounted(() => {
  if (!props.active || !root.value || !content.value || !overlay.value) return null
  return createJigsaw(
    { root: root.value, content: content.value, overlay: overlay.value },
    {
      rows: props.rows,
      cols: props.cols,
      seed: props.seed,
      scattered: props.scattered,
      draggable: props.draggable,
      sound: props.sound,
      onSolved: () => emit("solved"),
    },
  )
}, [
  () => props.active,
  () => props.rows,
  () => props.cols,
  () => props.seed,
  () => props.scattered,
  () => props.draggable,
])
watch(
  () => props.sound,
  (on) => controller.value?.setSound(on),
)

const state = useStore(controller)
</script>

<template>
  <div ref="root">
    <div ref="content"><slot /></div>
    <div ref="overlay" />

    <!-- クリア時のバナー -->
    <div v-if="state?.solved" class="jigsaw-banner-wrap">
      <div class="jigsaw-banner">🎉 クリア！</div>
    </div>

    <div v-if="controller && state && controls" class="jigsaw-controls">
      <v-chip size="small" variant="flat" class="jigsaw-count">
        {{ state.placed }} / {{ state.total }}
      </v-chip>
      <v-btn rounded="pill" color="#e8543f" class="jigsaw-btn" @click="controller.shuffle()">
        🔀 シャッフル
      </v-btn>
      <v-btn rounded="pill" color="#2d8f5a" class="jigsaw-btn" @click="controller.solve()">
        🧩 そろえる
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.jigsaw-banner-wrap {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 10000;
}
.jigsaw-banner {
  padding: 16px 28px;
  border-radius: 16px;
  background: rgba(20, 20, 30, 0.82);
  color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 1px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}
.jigsaw-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10001;
  display: flex;
  align-items: center;
  gap: 8px;
}
.jigsaw-count {
  background: rgba(20, 20, 30, 0.7) !important;
  color: #fff !important;
  font-weight: 600;
}
.jigsaw-btn {
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
</style>
