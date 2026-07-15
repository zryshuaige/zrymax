<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps<{ source: string }>()

const root = ref<HTMLElement | null>(null)
const html = computed(() => renderMarkdown(props.source))

// Shiki 懒加载：仅当存在代码块时才拉取，避免进入首屏体积。
// 采用 shiki/core + JS 正则引擎 + 按需语言/主题，避免拉入全部 300+ 语言。
interface CodeHighlighter {
  codeToHtml: (code: string, options: Record<string, unknown>) => string
}
let highlighter: CodeHighlighter | null = null
let inflight: Promise<CodeHighlighter | null> | null = null

function loadHighlighter(): Promise<CodeHighlighter | null> {
  if (highlighter) return Promise.resolve(highlighter)
  if (!inflight) {
    inflight = (async () => {
      try {
        const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
          import('shiki/core'),
          import('shiki/engine/javascript'),
        ])
        const core = await createHighlighterCore({
          themes: [import('shiki/themes/github-light.mjs')],
          langs: [
            import('shiki/langs/javascript.mjs'),
            import('shiki/langs/typescript.mjs'),
            import('shiki/langs/python.mjs'),
            import('shiki/langs/bash.mjs'),
            import('shiki/langs/json.mjs'),
            import('shiki/langs/markdown.mjs'),
          ],
          engine: createJavaScriptRegexEngine(),
        })
        highlighter = core as unknown as CodeHighlighter
        return highlighter
      } catch {
        return null
      }
    })()
  }
  return inflight
}

async function highlightCodeBlocks() {
  const el = root.value
  if (!el) return
  const blocks = Array.from(el.querySelectorAll<HTMLElement>('pre code'))
  if (blocks.length === 0) return

  const h = await loadHighlighter()
  if (!h) return

  for (const block of blocks) {
    if (block.dataset.shiki) continue
    block.dataset.shiki = '1'
    const code = block.textContent ?? ''
    const langMatch = block.className.match(/language-([\w-]+)/)
    const lang = langMatch?.[1] ?? 'text'
    try {
      const out = h.codeToHtml(code, { lang, theme: 'github-light' })
      const tmp = document.createElement('div')
      tmp.innerHTML = out
      const newPre = tmp.querySelector('pre')
      if (newPre && block.parentElement) {
        block.parentElement.replaceWith(newPre)
      }
    } catch {
      // 不支持的语言：保留纯文本，不抛错。
    }
  }
}

watch(
  () => html.value,
  () => {
    void nextTick(highlightCodeBlocks)
  },
  { immediate: true },
)
</script>

<template>
  <article ref="root" class="markdown-doc" v-html="html"></article>
</template>
