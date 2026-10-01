<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue"
import { ARTICLE, KPIS, PRODUCT, PROFILE, SETTINGS, sparklinePath } from "@hc/demo-data"

const yen = (n: number) => `¥${n.toLocaleString()}`

// プロフィール
const following = ref(false)
// 商品
const fav = ref(false)
const inCart = ref(0)
// 設定
const on = ref<Record<string, boolean>>({ mail: true, push: false, weekly: true })
// 記事
const open = ref(false)
// 読み込み中 → 中身
const loading = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  loading,
  (l) => {
    if (l) timer = setTimeout(() => (loading.value = false), 1500)
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(timer))
// 解約率は下がる方が良い
const good = (k: (typeof KPIS)[number]) => (k.label === "解約率" ? k.delta < 0 : k.delta >= 0)
</script>

<template>
  <div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      よく使うカードの型。画像の代わりにグラデーションと絵文字を使っている。
    </p>
    <v-row>
      <!-- プロフィール: 帯の上にアバターを重ね、フォローを切り替える -->
      <v-col cols="12" md="4">
        <v-card variant="outlined" class="h-100">
          <div
            :style="{
              height: '88px',
              background: `linear-gradient(120deg, ${PROFILE.color}, #00c2ff)`,
            }"
          />
          <v-card-text class="text-center" style="margin-top: -56px">
            <v-badge dot color="success" location="bottom end" offset-x="10" offset-y="10">
              <v-avatar size="88" :color="PROFILE.color" class="text-h4 avatar-ring">
                {{ PROFILE.initials }}
              </v-avatar>
            </v-badge>
            <div class="text-h6 mt-2">{{ PROFILE.name }}</div>
            <div class="text-body-2 text-medium-emphasis">{{ PROFILE.role }}</div>
            <p class="text-body-2 mt-3">{{ PROFILE.bio }}</p>
            <div class="d-flex justify-center mt-4">
              <div
                v-for="(s, i) in PROFILE.stats"
                :key="s.label"
                :class="['px-4', i ? 'border-s' : '']"
              >
                <div class="text-h6">{{ s.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ s.label }}</div>
              </div>
            </div>
          </v-card-text>
          <v-card-actions class="justify-center pb-4">
            <v-btn
              rounded="pill"
              class="px-6"
              color="primary"
              :variant="following ? 'outlined' : 'flat'"
              @click="following = !following"
            >
              {{ following ? "フォロー中" : "フォローする" }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-row>
          <!-- 数値: 前月比の矢印とミニグラフ -->
          <v-col v-for="k in KPIS" :key="k.label" cols="12" sm="4">
            <v-card variant="outlined" class="h-100">
              <v-card-text>
                <div class="text-body-2 text-medium-emphasis">{{ k.label }}</div>
                <div class="text-h5 font-weight-bold" :style="{ color: k.color }">
                  {{ k.value }}
                </div>
                <div
                  :class="[
                    'd-flex align-center text-caption',
                    good(k) ? 'text-success' : 'text-error',
                  ]"
                >
                  <v-icon
                    size="small"
                    :icon="k.delta >= 0 ? 'mdi-trending-up' : 'mdi-trending-down'"
                  />
                  <span class="ml-1">{{ k.delta >= 0 ? "+" : "" }}{{ k.delta }}% 前月比</span>
                </div>
                <svg viewBox="0 0 120 36" width="100%" height="36" class="mt-2" aria-hidden="true">
                  <path :d="`${sparklinePath(k.series)} L120,36 L0,36 Z`" :fill="`${k.color}22`" />
                  <path
                    :d="sparklinePath(k.series)"
                    fill="none"
                    :stroke="k.color"
                    stroke-width="2"
                  />
                </svg>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- 商品: バッジ・評価・お気に入り・カートに入れる -->
          <v-col cols="12" sm="6">
            <v-card variant="outlined" class="h-100 d-flex flex-column">
              <div
                class="media"
                :style="{ background: PRODUCT.gradient, height: '120px', fontSize: '56px' }"
              >
                {{ PRODUCT.emoji }}
                <v-chip color="error" variant="flat" size="small" class="font-weight-bold corner-l">
                  {{ PRODUCT.badge }}
                </v-chip>
                <v-btn
                  icon
                  variant="text"
                  class="corner-r"
                  :color="fav ? 'error' : 'white'"
                  aria-label="お気に入り"
                  @click="fav = !fav"
                >
                  <v-icon :icon="fav ? 'mdi-heart' : 'mdi-heart-outline'" />
                </v-btn>
              </div>
              <v-card-text class="flex-grow-1">
                <div class="text-subtitle-1 font-weight-bold">{{ PRODUCT.name }}</div>
                <div class="d-flex align-center">
                  <v-rating
                    :model-value="PRODUCT.rating"
                    half-increments
                    readonly
                    density="compact"
                    size="small"
                    color="amber"
                  />
                  <span class="text-caption text-medium-emphasis ml-1">
                    {{ PRODUCT.rating }} ({{ PRODUCT.reviews }})
                  </span>
                </div>
                <div class="d-flex align-baseline ga-2 mt-2">
                  <span class="text-h6 text-error font-weight-bold">{{ yen(PRODUCT.price) }}</span>
                  <span class="text-body-2 text-medium-emphasis text-decoration-line-through">
                    {{ yen(PRODUCT.listPrice) }}
                  </span>
                </div>
              </v-card-text>
              <v-card-actions>
                <v-btn
                  block
                  variant="flat"
                  color="primary"
                  prepend-icon="mdi-cart-plus"
                  @click="inCart++"
                >
                  {{ inCart ? `カートに入れる (${inCart})` : "カートに入れる" }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <!-- 設定: スイッチの一覧 -->
          <v-col cols="12" sm="6">
            <v-card
              variant="outlined"
              class="h-100"
              title="通知の設定"
              :subtitle="`${Object.values(on).filter(Boolean).length} / ${SETTINGS.length} 件オン`"
            >
              <v-list density="compact">
                <v-list-item v-for="s in SETTINGS" :key="s.key" :title="s.label" :subtitle="s.note">
                  <template #prepend>
                    <span class="text-h6 mr-3">{{ s.icon }}</span>
                  </template>
                  <template #append>
                    <v-switch v-model="on[s.key]" color="primary" hide-details density="compact" />
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-col>

      <!-- 記事: 見出し画像・タグ・続きを読む (開閉) -->
      <v-col cols="12" md="8">
        <v-card variant="outlined">
          <div class="d-flex flex-column flex-sm-row">
            <div
              class="media article-media"
              :style="{ background: ARTICLE.gradient, fontSize: '64px' }"
            >
              {{ ARTICLE.emoji }}
            </div>
            <div class="flex-grow-1">
              <v-card-text>
                <div class="text-overline text-primary">{{ ARTICLE.category }}</div>
                <div class="text-h6" style="line-height: 1.4">{{ ARTICLE.title }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ ARTICLE.date }} ・ {{ ARTICLE.readMin }} 分で読める
                </div>
                <p class="text-body-2 mt-2">{{ ARTICLE.summary }}</p>
                <v-expand-transition>
                  <p v-if="open" class="text-body-2 mt-2">{{ ARTICLE.body }}</p>
                </v-expand-transition>
              </v-card-text>
              <v-card-actions>
                <v-chip
                  v-for="t in ARTICLE.tags"
                  :key="t"
                  size="small"
                  variant="outlined"
                  class="mr-1"
                >
                  #{{ t }}
                </v-chip>
                <v-spacer />
                <v-btn
                  :append-icon="open ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  @click="open = !open"
                >
                  {{ open ? "閉じる" : "続きを読む" }}
                </v-btn>
              </v-card-actions>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- 読み込み中: 骨組み (スケルトン) を出してから中身に差し替える -->
      <v-col cols="12" md="4">
        <v-card variant="outlined" class="h-100">
          <v-skeleton-loader v-if="loading" type="list-item-avatar-two-line, image, paragraph" />
          <template v-else>
            <v-card-item title="田中 一郎" subtitle="3 分前">
              <template #prepend><v-avatar color="#0a9396">田</v-avatar></template>
              <template #append>
                <v-btn
                  icon="mdi-refresh"
                  variant="text"
                  aria-label="読み直す"
                  @click="loading = true"
                />
              </template>
            </v-card-item>
            <div
              class="media"
              style="
                height: 96px;
                font-size: 40px;
                background: linear-gradient(120deg, #0a9396, #94d2bd);
              "
            >
              🌿
            </div>
            <v-card-text>
              新しい観葉植物を迎えました。読み込み中は骨組みを出し、届いたら差し替えます
              (右上で読み直し)。
            </v-card-text>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.media {
  position: relative;
  display: grid;
  place-items: center;
}
.article-media {
  min-width: 200px;
  min-height: 140px;
}
.corner-l {
  position: absolute;
  top: 8px;
  left: 8px;
}
.corner-r {
  position: absolute;
  top: 4px;
  right: 4px;
}
.avatar-ring {
  border: 4px solid rgb(var(--v-theme-surface));
}
</style>
