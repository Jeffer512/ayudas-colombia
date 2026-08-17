import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Request } from '../lib/types'
import RequestEditPage from './RequestEditPage'

vi.mock('../api/client', () => ({
  api: {
    request: vi.fn(),
    updateRequest: vi.fn(),
    cities: vi.fn(),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

const mockedRequest = vi.mocked(api.request)
const mockedUpdate = vi.mocked(api.updateRequest)
const mockedCities = vi.mocked(api.cities)

const baseRequest: Request = {
  id: 'r1',
  isOwner: true,
  type: 'supplies_request',
  transport: 'can_transport',
  items: ['Agua'],
  urgency: 'high',
  status: 'open',
  title: 'Necesitamos agua potable',
  description: 'Familias de la cuadra requieren agua para cocinar.',
  address: 'Calle 12 #4-50',
  lat: 4.8133,
  lng: -75.6961,
  city: { code: 'pereira', name: 'Pereira' },
  reporter: {
    name: 'María Gómez',
    phone: '3158765432',
    whatsapp: null,
    email: null,
  },
  contactVisibility: 'public',
  helpers: 0,
  resolvedAt: null,
  createdAt: '2026-08-13T12:00:00Z',
  updatedAt: '2026-08-13T12:00:00Z',
}

function renderPage(request: Request = baseRequest) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  mockedRequest.mockResolvedValue(request)
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pedido/r1/editar']}>
        <Routes>
          <Route path="/pedido/:id/editar" element={<RequestEditPage />} />
          <Route path="/pedido/r1" element={<div>DETALLE_PEDIDO</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RequestEditPage', () => {
  beforeEach(() => {
    mockedRequest.mockReset()
    mockedUpdate.mockReset()
    mockedCities.mockReset()
    mockedCities.mockResolvedValue({
      cities: [
        { id: 1, code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8133, centerLng: -75.6961 },
      ],
    })
    mockedUpdate.mockResolvedValue(baseRequest)
  })

  it('edita un pedido abierto y navega al detalle', async () => {
    const user = userEvent.setup()
    renderPage()

    const titleInput = await screen.findByLabelText('Título')
    await user.clear(titleInput)
    await user.type(titleInput, 'Necesitamos más agua potable')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({
          title: 'Necesitamos más agua potable',
          urgency: 'high',
          transport: 'can_transport',
          items: ['Agua'],
          reporter: expect.objectContaining({ phone: '3158765432' }),
        }),
      ),
    )
    expect(mockedUpdate.mock.calls[0][1]).not.toHaveProperty('resolveCode')

    expect(await screen.findByText('DETALLE_PEDIDO')).toBeInTheDocument()
  })

  it('el dueño no tiene que escribir el código de cierre', async () => {
    renderPage({ ...baseRequest, isOwner: true })

    expect(
      await screen.findByRole('button', { name: 'Guardar cambios' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Código de cierre (4 dígitos)'),
    ).not.toBeInTheDocument()
  })

  it('exige el código de cierre cuando el visitante no es el autor', async () => {
    const user = userEvent.setup()
    renderPage({ ...baseRequest, isOwner: false })

    const titleInput = await screen.findByLabelText('Título')
    await user.clear(titleInput)
    await user.type(titleInput, 'Necesitamos más agua potable')
    await user.type(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
      '1234',
    )

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ resolveCode: '1234' }),
      ),
    )
  })

  it('muestra error cuando el código de cierre es incorrecto', async () => {
    mockedUpdate.mockRejectedValue(new Error('Código de cierre incorrecto'))
    const user = userEvent.setup()
    renderPage({ ...baseRequest, isOwner: false })

    await user.type(
      await screen.findByLabelText('Código de cierre (4 dígitos)'),
      '0000',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Código de cierre incorrecto',
    )
  })

  it('bloquea la edición cuando ya hay personas ayudando', async () => {
    renderPage({ ...baseRequest, helpers: 2 })

    expect(
      await screen.findByText(
        'Ya hay personas ayudando en este pedido y no se puede editar.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios' }),
    ).not.toBeInTheDocument()
  })

  it('bloquea la edición de un pedido cerrado', async () => {
    renderPage({ ...baseRequest, status: 'resolved', resolvedAt: '2026-08-14T10:00:00Z' })

    expect(
      await screen.findByText(
        'Este pedido ya no está abierto y no se puede editar.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios' }),
    ).not.toBeInTheDocument()
  })
})