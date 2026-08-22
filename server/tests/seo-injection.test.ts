import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { env } from '../src/config.js'
import { createApp } from '../src/app.js'
import { loadTemplate } from '../src/seo/injectHead.js'
import { createRequest } from './factories.js'

const HOST = 'ayuda.example.com'
const FIXTURE = new URL('./fixtures', import.meta.url).pathname

function appWithProxy() {
  const app = createApp()
  app.set('trust proxy', 1)
  return app
}

function get(path: string) {
  return request(appWithProxy()).get(path).set('host', HOST).set('x-forwarded-proto', 'https')
}

describe('Inyección de head SEO', () => {
  beforeAll(() => {
    env.production = true
    env.webDist = FIXTURE
    loadTemplate(FIXTURE)
  })

  it('la portada es indexable e incluye SpecialAnnouncement', async () => {
    const res = await get('/')
    expect(res.status).toBe(200)
    expect(res.text).toContain(
      '<title>Ayuda Colombia — Coordinación y Donaciones por Terremoto</title>',
    )
    expect(res.text).toContain('content="index,follow"')
    expect(res.text).toContain(`https://${HOST}/og-image.png`)
    expect(res.text).toContain('<meta property="og:image:width" content="1200" />')
    expect(res.text).toContain('<meta property="og:image:height" content="630" />')
    expect(res.text).toContain('application/ld+json')
    expect(res.text).toContain('"@type":"SpecialAnnouncement"')
  })

  it('una entidad existente es noindex pero tiene tarjeta OG', async () => {
    const pedido = await createRequest({ title: 'Se necesita agua en Popayán' })
    const res = await get(`/pedido/${pedido.id}`)
    expect(res.status).toBe(200)
    expect(res.text).toContain('content="noindex,follow"')
    expect(res.text).toContain('Se necesita agua en Popayán')
    expect(res.text).toContain('— Ayuda Colombia')
    expect(res.text).toContain('<meta property="og:image:width" content="1200" />')
    expect(res.text).not.toContain('content="index,follow"')
  })

  it('una entidad inexistente responde 404', async () => {
    const res = await get('/pedido/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
    expect(res.text).toContain('content="noindex,follow"')
  })

  it('las rutas de administración son noindex,nofollow', async () => {
    const res = await get('/admin')
    expect(res.status).toBe(200)
    expect(res.text).toContain('content="noindex,nofollow"')
  })
})
