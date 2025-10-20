<template>
  <div class="nav-page">
    <!-- 搜索框 -->
    <input v-model="keyword" placeholder="搜索工具…" class="search-input" />

    <!-- 分组循环 -->
    <section v-for="g in filteredGroups" :key="g.name" class="group">
      <h3 @click="toggle(g.name)" class="group-title">
        <span>{{ g.name }}</span>
        <span class="arrow" :class="{ open: opened[g.name] }">▸</span>
      </h3>

      <Transition>
        <div v-show="opened[g.name]" class="cards">
          <a
              v-for="item in g.items"
              :key="item.url"
              :href="item.url"
              target="_blank"
              rel="noopener"
              class="card"
          >
            <img
                v-if="item.favicon"
                :src="item.favicon"
                class="favicon"
                loading="lazy"
            />
            <div class="info">
              <div class="title">{{ item.title }}</div>
              <div class="desc">{{ item.desc }}</div>
            </div>
          </a>
        </div>
      </Transition>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

// 1. 在这里一次性写完全部网址
const links = [
  {
    name: '开发',
    items: [
      {
        title: 'VitePress',
        desc: '静态站生成器',
        url: 'https://vitepress.dev',
        favicon: 'https://vitepress.dev/logo.svg'
      },
      {
        title: 'GitHub',
        desc: '代码托管',
        url: 'https://github.com',
        favicon: 'https://github.com/favicon.ico'
      }
    ]
  },
  {
    name: '设计',
    items: [
      {
        title: 'Figma',
        desc: '在线设计',
        url: 'https://figma.com',
        favicon: 'https://figma.com/favicon.ico'
      }
    ]
  },
  {
    name: 'AI 工具',
    items: [
      {
        title: 'ChatGPT',
        desc: '对话 AI',
        url: 'https://chat.openai.com',
        favicon: 'https://chat.openai.com/favicon.ico'
      }
    ]
  }
]

// 2. 搜索 & 折叠状态
const keyword = ref('')
const opened = reactive(
    Object.fromEntries(links.map(g => [g.name, true]))
)

const toggle = name => (opened[name] = !opened[name])

const filteredGroups = computed(() =>
    links
        .map(g => ({
          ...g,
          items: g.items.filter(i =>
              i.title.toLowerCase().includes(keyword.value.toLowerCase()) ||
              i.desc.toLowerCase().includes(keyword.value.toLowerCase())
          )
        }))
        .filter(g => g.items.length)
)
</script>

<style scoped>
.nav-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
.search-input {
  width: 100%;
  max-width: 400px;
  margin: 0 auto 2rem;
  display: block;
  padding: 0.6rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 1rem;
}
.group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 2rem 0 1rem;
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-brand);
}
.arrow {
  transition: transform 0.2s;
}
.arrow.open {
  transform: rotate(90deg);
}
.cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  transition: border-color 0.2s, background 0.2s;
}
.card:hover {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-bg-mute);
}
.favicon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
.info {
  flex: 1;
  overflow: hidden;
}
.title {
  font-weight: 500;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.desc {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
.v-enter-active,
.v-leave-active {
  transition: all 0.2s ease;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>