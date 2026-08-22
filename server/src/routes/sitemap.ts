import { Router } from 'express'

export const sitemapRouter = Router()

const STATIC_URLS = [
  { path: '/', changefreq: 'hourly', priority: '1.0' },
  { path: '/red-de-ayudas', changefreq: 'daily', priority: '0.8' },
  { path: '/guia', changefreq: 'weekly', priority: '0.6' },
]

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildSitemap(baseUrl: string): string {
  const items = STATIC_URLS.map((url) => {
    const loc = escapeXml(`${baseUrl}${url.path}`)
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <changefreq>${url.changefreq}</changefreq>`,
      `    <priority>${url.priority}</priority>`,
      '  </url>',
    ].join('\n')
  }).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`
}

sitemapRouter.get('/sitemap.xml', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.type('application/xml').send(buildSitemap(baseUrl))
})
