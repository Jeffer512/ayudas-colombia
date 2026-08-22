import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

const HOST = 'ayuda.example.com'

function appWithProxy() {
  const app = createApp()
  app.set('trust proxy', 1)
  return app
}

function get(path: string) {
  return request(appWithProxy())
    .get(path)
    .set('host', HOST)
    .set('x-forwarded-proto', 'https')
}

describe('GET /robots.txt', () => {
  it('permite el rastreo y apunta al sitemap con host absoluto', async () => {
    const res = await get('/robots.txt')
    expect(res.status).toBe(200)
    expect(res.type).toBe('text/plain')
    expect(res.text).toContain('User-agent: *')
    expect(res.text).toContain('Allow: /')
    expect(res.text).toContain(`Sitemap: https://${HOST}/sitemap.xml`)
  })

  it('bloquea las rutas privadas y de edición', async () => {
    const res = await get('/robots.txt')
    for (const path of [
      '/admin',
      '/iniciar-sesion',
      '/registro',
      '/cuenta',
      '/mi-organizacion',
      '/*/editar',
    ]) {
      expect(res.text).toContain(`Disallow: ${path}`)
    }
  })
})

describe('GET /sitemap.xml', () => {
  it('lista solo las páginas indexables con urls absolutas', async () => {
    const res = await get('/sitemap.xml')
    expect(res.status).toBe(200)
    expect(res.type).toBe('application/xml')
    expect(res.text).toContain(`<loc>https://${HOST}/</loc>`)
    expect(res.text).toContain(`<loc>https://${HOST}/red-de-ayudas</loc>`)
    expect(res.text).toContain('<priority>1.0</priority>')
    expect(res.text).toContain('<changefreq>hourly</changefreq>')
  })

  it('no incluye urls de entidades', async () => {
    const res = await get('/sitemap.xml')
    expect(res.text).not.toContain('/pedido/')
    expect(res.text).not.toContain('/oferta/')
    expect(res.text).not.toContain('/aviso/')
    expect(res.text).not.toContain('/organizacion/')
  })
})
