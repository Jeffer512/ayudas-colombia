import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Request } from '../lib/types'
import RequestCard from './RequestCard'

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'r1',
    type: 'missing_pet',
    transport: null,
    items: [],
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

function renderCard(request: Request) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RequestCard request={request} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
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

  it('muestra los ítems del pedido cuando existen', () => {
    render(
      <MemoryRouter>
        <RequestCard request={makeRequest({ items: ['Agua', 'Comida'] })} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Agua')).toBeInTheDocument()
    expect(screen.getByText('Comida')).toBeInTheDocument()
  })

  it('muestra el botón de ayuda en pedidos abiertos', () => {
    renderCard(makeRequest())
    expect(
      screen.getByRole('button', { name: 'Voy a ayudar' }),
    ).toBeInTheDocument()
  })

  it('oculta el botón de ayuda a quien creó el pedido', () => {
    renderCard(makeRequest({ isOwner: true }))
    expect(
      screen.queryByRole('button', { name: 'Voy a ayudar' }),
    ).not.toBeInTheDocument()
  })

  it('oculta el botón de ayuda en pedidos cerrados', () => {
    renderCard(makeRequest({ status: 'resolved' }))
    expect(
      screen.queryByRole('button', { name: 'Voy a ayudar' }),
    ).not.toBeInTheDocument()
  })

  it('abre el formulario de ayuda en un modal y lo cierra con Escape', async () => {
    const user = userEvent.setup()
    renderCard(makeRequest())

    await user.click(screen.getByRole('button', { name: 'Voy a ayudar' }))

    const dialog = screen.getByRole('dialog', { name: 'Voy a ayudar' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(
      screen.getByRole('button', { name: 'Confirmar' }),
    ).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cierra el formulario con el botón Cerrar del modal', async () => {
    const user = userEvent.setup()
    renderCard(makeRequest())

    await user.click(screen.getByRole('button', { name: 'Voy a ayudar' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})