import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: true,
})

// 让所有外链在新标签页打开并加固 rel。
const renderLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')
  return renderLinkOpen(tokens, idx, options, env, self)
}

/**
 * 将 Markdown 渲染为经 DOMPurify 消毒的 HTML。
 * 替代原先手写的轻量解析器，支持表格 / 代码块 / 嵌套列表等。
 */
export function renderMarkdown(source: string): string {
  const dirty = md.render(source ?? '')
  return DOMPurify.sanitize(dirty, { ADD_ATTR: ['target', 'rel'] })
}
