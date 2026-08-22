import fs from 'node:fs'
import path from 'node:path'

let templateCache: string | null = null

export function loadTemplate(webDist: string) {
  if (templateCache !== null) return
  templateCache = fs.readFileSync(path.join(webDist, 'index.html'), 'utf-8')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

function buildExtra(meta: import('./buildHead.js').SeoMeta): string {
  const parts = [
    `<meta name="robots" content="${escapeAttr(meta.robots)}" />`,
    `<meta property="og:title" content="${escapeAttr(meta.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.ogDescription)}" />`,
    `<meta property="og:type" content="${escapeAttr(meta.ogType)}" />`,
    `<meta property="og:url" content="${escapeAttr(meta.canonical)}" />`,
    `<meta property="og:image" content="${escapeAttr(meta.ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.ogTitle)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.ogDescription)}" />`,
  ]
  if (meta.jsonLd) {
    parts.push(`<script type="application/ld+json">${meta.jsonLd}</script>`)
  }
  return parts.join('\n    ')
}

export function renderHtml(meta: import('./buildHead.js').SeoMeta): string {
  if (templateCache === null) {
    throw new Error('SEO template not loaded')
  }
  let html = templateCache
  html = html.replace(
    /<title data-seo>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`,
  )
  html = html.replace(
    /<meta data-seo name="description"[^>]*>/,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
  )
  html = html.replace(
    /<link data-seo rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${escapeAttr(meta.canonical)}" />`,
  )
  html = html.replace(/<!--SEO_EXTRA-->/, buildExtra(meta))
  return html
}
