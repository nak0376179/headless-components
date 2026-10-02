<script setup lang="ts">
// 任意のページを包み、クリックした地点からガラスのように割る (Vuetify)。
// 破片の生成・ドラッグ・音はすべて @/utils の createShatterGlass が持ち、ここは箱と操作バーを描くだけ。
import { ref } from "vue"
import { useMounted } from "@/composables/draft/useMounted"
import { useStore } from "@/composables/useStore"
import { createShatterGlass } from "@/utils/draft"

const props = withDefaults(
  defineProps<{
    /** 効果をオフにする（中身は通常どおり表示され、砕けない）。 */
    active?: boolean
    /** 放射状スポークのおおよその本数（4 の倍数に丸められる）。 */
    spokes?: number
    /** 衝撃点から端までの同心リングの数。 */
    rings?: number
    /** ひび模様の不規則さ 0–1。 */
    jitter?: number
    /** 砕けたあと破片をドラッグできるようにする。 */
    draggable?: boolean
    /** フローティングの操作バー（落とす / 元に戻す）を表示する。 */
    controls?: boolean
    /** 衝撃時に合成したガラスの割れる音を鳴らす。 */
    sound?: boolean
  }>(),
  { active: true, spokes: 16, rings: 4, jitter: 0.5, draggable: true, controls: true, sound: true },
)
// React 版の onShatter に当たるイベント。
const emit = defineEmits<{ shatter: [] }>()

const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const overlay = ref<HTMLElement | null>(null)

// active=false のときもコントローラを作らないだけで、箱の構成は同じにする (ただの div が 2 枚)。
const controller = useMounted(() => {
  if (!props.active || !root.value || !content.value || !overlay.value) return null
  return createShatterGlass(
    { root: root.value, content: content.value, overlay: overlay.value },
    {
      spokes: props.spokes,
      rings: props.rings,
      jitter: props.jitter,
      draggable: props.draggable,
      sound: props.sound,
      onShatter: () => emit("shatter"),
    },
  )
}, [
  () => props.active,
  () => props.spokes,
  () => props.rings,
  () => props.jitter,
  () => props.draggable,
  () => props.sound,
])
const state = useStore(controller)
</script>

<template>
  <div ref="root" class="shatter-glass">
    <div ref="content"><slot /></div>
    <div ref="overlay" />
    <div v-if="controls && controller && state?.shattered" class="shatter-controls">
      <v-btn rounded="pill" color="#0a9396" class="pill" @click="controller.drop()">
        💧 落とす
      </v-btn>
      <v-btn rounded="pill" color="#2d8f5a" class="pill" @click="controller.repair()">
        🔧 元に戻す
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.shatter-glass {
  position: relative;
}
.shatter-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10001;
  display: flex;
  gap: 8px;
}
.pill {
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
</style>
