<script setup lang="ts">
// 隠しコマンド (↑ ↑ ↓ ↓ ← → ← → B A) で解除されるイースターエッグ (Vuetify)。
// キー照合・効果音・紙吹雪・きらめきは @core の createCheatCode が持ち、ここは
// host 要素と秘密のバナーを描くだけ。包む中身は default スロット、秘密は secret スロットで差し替える。
import { ref, watch } from "vue"
import {
  CHEAT_POP_ANIMATION,
  CHEAT_SECRET_Z_INDEX,
  CHEAT_SEQUENCE,
  createCheatCode,
  type CheatCodeOptions,
} from "@core"
import { useMounted } from "@/composables/useMounted"
import { useStore } from "@/composables/useStore"

const props = withDefaults(
  defineProps<{
    /** キー入力シーケンスを上書きする (KeyboardEvent.key の値、大文字小文字は無視)。 */
    code?: readonly string[]
    /** 解除時に紙吹雪を降らせる。 */
    confetti?: boolean
    /** 解除時にページ全体へ短い虹色のきらめきをかける。 */
    shimmer?: boolean
    /** 解除時に合成したパワーアップ音を鳴らす。 */
    sound?: boolean
    /** 2 回目の入力で解除を切り替えず、解除したままにする。 */
    sticky?: boolean
  }>(),
  { code: () => CHEAT_SEQUENCE, confetti: true, shimmer: true, sound: true, sticky: false },
)
/** unlock: コードが完成するたびに発火する (React 版の onUnlock)。 */
const emit = defineEmits<{ unlock: [] }>()
defineSlots<{
  default?: () => unknown
  /** 解除されたときに表示する内容。省略時はお祝いのバナー。 */
  secret?: (props: { close: () => void }) => unknown
}>()

const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const overlay = ref<HTMLElement | null>(null)

const options = (): CheatCodeOptions => ({
  code: props.code,
  confetti: props.confetti,
  shimmer: props.shimmer,
  sound: props.sound,
  sticky: props.sticky,
  onUnlock: () => emit("unlock"),
})

const controller = useMounted(() =>
  root.value && content.value && overlay.value
    ? createCheatCode(
        { root: root.value, content: content.value, overlay: overlay.value },
        options(),
      )
    : null,
)
// props の差し替えはコントローラを作りなおさずに反映する (code が変われば進み具合はリセット)。
watch(
  () => [props.code.join("\u0000"), props.confetti, props.shimmer, props.sound, props.sticky],
  () => controller.value?.setOptions(options()),
)
const state = useStore(controller)
const close = () => controller.value?.close()
</script>

<template>
  <div ref="root" class="cheat-code">
    <div ref="content"><slot /></div>
    <!-- 紙吹雪のレイヤー (中身とスタイルはコントローラが管理する) -->
    <div ref="overlay" />

    <!-- 秘密のコンテンツ -->
    <div v-if="state?.unlocked" class="secret-layer" :style="{ zIndex: CHEAT_SECRET_Z_INDEX }">
      <div class="secret-pop" :style="{ animation: CHEAT_POP_ANIMATION }">
        <slot name="secret" :close="close">
          <v-sheet
            role="dialog"
            aria-label="隠しコマンド成功"
            class="default-secret"
            color="rgba(20,20,30,0.9)"
          >
            <div class="emoji">🎉</div>
            <div class="title">残機 30 機 解除！</div>
            <div class="body">
              隠しコマンド成功。<code>secret</code> スロットで中身を差し替えられます。
            </div>
            <v-btn class="close" color="#6a5cff" rounded="pill" variant="flat" @click="close">
              閉じる (Esc)
            </v-btn>
          </v-sheet>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cheat-code {
  position: relative;
}
.secret-layer {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}
.secret-pop {
  pointer-events: auto;
}
.default-secret {
  padding: 28px 36px;
  border-radius: 20px;
  color: #fff;
  font-family: system-ui, sans-serif;
  text-align: center;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
  max-width: 360px;
}
.emoji {
  font-size: 44px;
  line-height: 1.2;
}
.title {
  font-size: 24px;
  font-weight: 800;
  margin: 6px 0;
}
.body {
  opacity: 0.8;
  font-size: 14px;
}
.close {
  margin-top: 18px;
  font-weight: 700;
  letter-spacing: normal;
  text-transform: none;
}
</style>
