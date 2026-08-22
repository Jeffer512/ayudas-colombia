import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { usePageHead } from './usePageHead'

function HeadProbe() {
  usePageHead()
  return <div>probe</div>
}

function OverrideProbe({ title, description }: { title: string; description?: string }) {
  usePageHead({ title, description })
  return <div>probe</div>
}

function renderAt(path: string, node: React.ReactNode = <HeadProbe />) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={node} />
      </Routes>
    </MemoryRouter>,
  )
}

function robotsContent() {
  return document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null
}

function canonicalHref() {
  return document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null
}

function titleFor() {
  return document.head.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? null
}

describe('usePageHead', () => {
  beforeEach(() => {
    document.title = ''
    document.head.querySelector('meta[name="robots"]')?.remove()
    document.head.querySelector('meta[name="description"]')?.remove()
    document.head.querySelector('meta[property="og:title"]')?.remove()
    document.head.querySelector('link[rel="canonical"]')?.remove()
  })
  afterEach(cleanup)

  it('la portada es indexable y define canonical absoluto', () => {
    renderAt('/')
    expect(document.title).toBe('Ayuda Colombia — Coordinación y Donaciones por Terremoto')
    expect(robotsContent()).toBe('index,follow')
    expect(canonicalHref()).toBe(window.location.origin + '/')
  })

  it('red-de-ayudas es indexable', () => {
    renderAt('/red-de-ayudas')
    expect(robotsContent()).toBe('index,follow')
    expect(document.title).toContain('Red de Ayudas')
  })

  it('las rutas de ayuda no son indexables pero permiten seguimiento', () => {
    renderAt('/pedir-ayuda')
    expect(robotsContent()).toBe('noindex,follow')
    expect(document.title).toContain('Solicitar Ayuda')
  })

  it('las rutas de administración bloquean indización y seguimiento', () => {
    renderAt('/admin')
    expect(robotsContent()).toBe('noindex,nofollow')
  })

  it('las subrutas de administración también son noindex,nofollow', () => {
    renderAt('/admin/usuarios')
    expect(robotsContent()).toBe('noindex,nofollow')
  })

  it('las rutas de edición usan noindex,nofollow', () => {
    renderAt('/pedido/123/editar')
    expect(robotsContent()).toBe('noindex,nofollow')
  })

  it('permite sobreescribir el title con metadatos de entidad', () => {
    renderAt('/pedido/123', <OverrideProbe title="Urgente: Agua en Popayán" description="Necesitamos agua potable" />)
    expect(document.title).toBe('Urgente: Agua en Popayán')
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Necesitamos agua potable',
    )
    expect(titleFor()).toBe('Urgente: Agua en Popayán')
  })

  it('en rutas de entidad sin override no pisa el title de la página', () => {
    renderAt('/pedido/123')
    expect(document.title).toBe('')
    expect(document.title).not.toBe('Ayuda Colombia — Red de Emergencia')
  })

  it('actualiza el head al cambiar de ruta en el cliente', () => {
    const { unmount } = renderAt('/')
    expect(robotsContent()).toBe('index,follow')
    unmount()
    renderAt('/pedir-ayuda')
    expect(robotsContent()).toBe('noindex,follow')
    expect(document.title).toContain('Solicitar Ayuda')
  })
})
