import { describe, expect, it } from 'vitest'
import { INDEXABLE_ROUTES, routeMeta } from './routeMeta'

describe('routeMeta', () => {
  it('las rutas indexables son indexables con index,follow', () => {
    for (const path of ['/', '/red-de-ayudas', '/guia'] as const) {
      expect(routeMeta(path).indexable).toBe(true)
      expect(routeMeta(path).robots).toBe('index,follow')
    }
  })

  it('las rutas indexables tienen título propio', () => {
    expect(routeMeta('/').title).toBe('Ayuda Colombia — Coordinación y Donaciones por Terremoto')
    expect(routeMeta('/red-de-ayudas').title).toBe('Red de Ayudas y Centros de Acopio — Ayuda Colombia')
    expect(routeMeta('/guia').title).toBe('Guía de ayuda — Ayuda Colombia')
  })

  it('la guía tiene descripción propia', () => {
    expect(routeMeta('/guia').description).toContain('solicitar ayuda')
  })

  it('las rutas privadas no son indexables', () => {
    expect(routeMeta('/admin').indexable).toBe(false)
    expect(routeMeta('/pedido/123').indexable).toBe(false)
    expect(routeMeta('/mi-organizacion').indexable).toBe(false)
  })

  it('las rutas indexables están en INDEXABLE_ROUTES', () => {
    expect(INDEXABLE_ROUTES).toEqual(['/', '/red-de-ayudas', '/guia'])
  })
})
