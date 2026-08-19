import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response
}

describe('api client', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envía el identificador de visitante y lo conserva entre peticiones', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ cities: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await api.cities()
    await api.cities()

    const ids = fetchMock.mock.calls.map(
      ([, init]) => (init.headers as Record<string, string>)['X-Visitor-Id'],
    )
    expect(ids[0]).toBeTruthy()
    expect(ids[1]).toBe(ids[0])
    expect(window.localStorage.getItem('ayudas_visitor_id')).toBe(ids[0])
  })

  it('envía el token de administración en la petición de estadísticas', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ daily: [], today: 0, last7: 0, last30: 0 }))
    vi.stubGlobal('fetch', fetchMock)

    await api.adminAnalytics('secreto')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/analytics')
    expect((init.headers as Record<string, string>)['x-admin-token']).toBe('secreto')
  })
})