import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Request } from '../lib/types'
import RequestCard from './RequestCard'

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'r1',
    type: 'missing_pet',
    transport: null,
    urgency: 'medium',
    status: 'open',
    title: 'Perro perdido',
    description: 'Se escapó un golden en el barrio.',
    photo: null,
    address: null,
    lat: 4.81,
    lng: -75.69,
    city: { code: 'pereira', name: 'Pereira' },
    reporter: { name: 'Ana', phone: '3100000000', whatsapp: null, email: null },
    helpers: 0,
    resolvedAt: null,
    createdAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('RequestCard', () => {
  it('muestra la foto cuando el pedido tiene una', () => {
    render(
      <MemoryRouter>
        <RequestCard request={makeRequest({ photo: 'https://ejemplo.com/foto.jpg' })} />
      </MemoryRouter>,
    )
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toBe('https://ejemplo.com/foto.jpg')
  })

  it('no muestra ninguna imagen cuando el pedido no tiene foto', () => {
    render(
      <MemoryRouter>
        <RequestCard request={makeRequest()} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})