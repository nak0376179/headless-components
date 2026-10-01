<script setup lang="ts">
// createDialogs で開いた確認・お知らせ・入力のダイアログを描く (Vuetify)。アプリのどこか 1 か所に置く。
// 開く・閉じる・送信中・エラーはすべてコア側が持ち、ここは stack を描くだけ (React 版の DialogHost と同じ)。
import { useDisplay } from "vuetify"
import type { DialogsController } from "@hc/core"
import { useStore } from "@hc/vue"

const props = defineProps<{
  /** @hc/core の createDialogs() で作ったもの (アプリで 1 つ作って使い回す)。 */
  dialogs: DialogsController
}>()
const state = useStore(props.dialogs)
const { smAndDown } = useDisplay()
const onEnter = (id: number, e: KeyboardEvent) => {
  if (!e.isComposing) void props.dialogs.accept(id)
}
</script>

<template>
  <v-dialog
    v-for="d in state.stack"
    :key="d.id"
    :model-value="true"
    max-width="440"
    :fullscreen="smAndDown && d.kind === 'prompt'"
    :persistent="d.busy"
    @update:model-value="(open: boolean) => !open && dialogs.dismiss(d.id)"
  >
    <v-card>
      <!-- 長い題名は折り返す (v-card の title は 1 行で切れるため) -->
      <v-card-title class="text-wrap">{{ d.title }}</v-card-title>
      <v-card-text>
        <p v-if="d.message" class="text-medium-emphasis" style="white-space: pre-wrap">
          {{ d.message }}
        </p>
        <v-text-field
          v-if="d.input"
          autofocus
          class="mt-2"
          :label="d.input.label"
          :placeholder="d.input.placeholder"
          :model-value="d.input.value"
          :error-messages="d.input.value !== '' ? (d.input.error ?? undefined) : undefined"
          :disabled="d.busy"
          @update:model-value="(v: string) => dialogs.setInput(d.id, v)"
          @keydown.enter="(e: KeyboardEvent) => onEnter(d.id, e)"
        />
        <v-alert v-if="d.error" type="error" density="compact" class="mt-2">{{ d.error }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn v-if="d.cancelLabel" :disabled="d.busy" @click="dialogs.dismiss(d.id)">
          {{ d.cancelLabel }}
        </v-btn>
        <v-btn
          variant="flat"
          :color="d.danger ? 'error' : 'primary'"
          :loading="d.busy"
          :disabled="d.input?.error != null"
          @click="dialogs.accept(d.id)"
        >
          {{ d.error ? "もう一度" : d.okLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
