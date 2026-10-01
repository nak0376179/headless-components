<script setup lang="ts">
// 包んだページに雪を降らせ、data-snow-target を付けた要素の上の縁と地面に積もらせる (Vuetify)。
// 降る・積もる・崩れる・払い落とすはすべて @core の createSnowfall が持ち、ここは箱と操作パネルを描くだけ。
import { ref } from "vue"
import { useMounted } from "@/composables/useMounted"
import { useStore } from "@/composables/useStore"
import { createSnowfall } from "@core"

const props = withDefaults(
  defineProps<{
    /** 効果をオフにする (中身は通常どおり表示される)。 */
    active?: boolean
    /** 降る量 (1 秒・幅 1000px あたりの粒の数)。 */
    intensity?: number
    /** 風 (px/秒。正で右へ)。 */
    wind?: number
    /** 積もらせる。 */
    accumulate?: boolean
    /** 積もる深さの上限 (px)。 */
    maxDepth?: number
    /** root の底 (地面) にも積もらせる。 */
    ground?: boolean
    /** 右上の操作パネル (強さ・風・払う・溶かす)。 */
    controls?: boolean
  }>(),
  {
    active: true,
    intensity: 70,
    wind: 15,
    accumulate: true,
    maxDepth: 24,
    ground: true,
    controls: true,
  },
)

const root = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
// 強さと風は作り直さずに setIntensity / setWind で変える
const controller = useMounted(() => {
  if (!props.active || !root.value || !canvas.value) return null
  return createSnowfall(
    { root: root.value, canvas: canvas.value },
    {
      intensity: props.intensity,
      wind: props.wind,
      accumulate: props.accumulate,
      maxDepth: props.maxDepth,
      ground: props.ground,
    },
  )
}, [() => props.active, () => props.accumulate, () => props.maxDepth, () => props.ground])
const state = useStore(controller)
// React 版の controllerRef に当たるもの (shake / melt を外から呼ぶ)
defineExpose({ controller })
</script>

<template>
  <div ref="root" style="position: relative">
    <slot />
    <canvas ref="canvas" aria-hidden="true" />
    <div v-if="controls && controller && state" class="snow-panel">
      <div class="text-caption">❄️ 降る量</div>
      <v-slider
        :model-value="state.intensity"
        :min="0"
        :max="300"
        density="compact"
        hide-details
        @update:model-value="(v: number) => controller?.setIntensity(v)"
      />
      <div class="text-caption">🌬️ 風</div>
      <v-slider
        :model-value="state.wind"
        :min="-120"
        :max="120"
        density="compact"
        hide-details
        @update:model-value="(v: number) => controller?.setWind(v)"
      />
      <div class="d-flex ga-2 mt-1">
        <v-btn size="small" variant="outlined" @click="controller.shake()">払う</v-btn>
        <v-btn size="small" variant="text" @click="controller.melt()">溶かす</v-btn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.snow-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 220px;
  padding: 12px;
  border-radius: 4px;
  color: #123;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
</style>
