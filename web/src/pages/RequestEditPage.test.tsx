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
    verifyRequestCode: vi.fn(),
    cities: vi.fn(),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

const mockedRequest = vi.mocked(api.request)
const mockedUpdate = vi.mocked(api.updateRequest)
const mockedVerify = vi.mocked(api.verifyRequestCode)
const mockedCities = vi.mocked(api.cities)

const baseRequest: Request = {
  id: 'r1',
  type: 'supplies_request',
  transport: 'can_transport',
  items: ['Alimentación'],
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

function renderPage(request: Request = baseRequest, state?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  mockedRequest.mockResolvedValue(request)
  const entry = state
    ? { pathname: '/pedido/r1/editar', state: { resolveCode: state } }
    : '/pedido/r1/editar'
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
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
    mockedVerify.mockReset()
    mockedCities.mockReset()
    mockedCities.mockResolvedValue({
      cities: [
        { id: 1, code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8133, centerLng: -75.6961 },
      ],
    })
    mockedUpdate.mockResolvedValue(baseRequest)
    mockedVerify.mockResolvedValue({ ok: true })
  })

  it('el autor edita sin pedir código y guarda sin resolveCode', async () => {
    const user = userEvent.setup()
    renderPage({ ...baseRequest, isOwner: true })

    const titleInput = await screen.findByLabelText('Título')
    await user.clear(titleInput)
    await user.type(titleInput, 'Necesitamos más agua potable')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ title: 'Necesitamos más agua potable' }),
      ),
    )
    expect(mockedUpdate.mock.calls[0][1]).not.toHaveProperty('resolveCode')
    expect(mockedVerify).not.toHaveBeenCalled()

    expect(await screen.findByText('DETALLE_PEDIDO')).toBeInTheDocument()
  })

  it('pide el código antes de mostrar el formulario a un visitante sin estado', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByRole('button', { name: 'Verificar código' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios' }),
    ).not.toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
      '1234',
    )
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    await waitFor(() =>
      expect(mockedVerify).toHaveBeenCalledWith('r1', '1234'),
    )

    const titleInput = await screen.findByLabelText('Título')
    await user.clear(titleInput)
    await user.type(titleInput, 'Necesitamos más agua potable')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({
          title: 'Necesitamos más agua potable',
          resolveCode: '1234',
        }),
      ),
    )
  })

  it('usa el código del estado de navegación sin volver a pedirlo', async () => {
    const user = userEvent.setup()
    renderPage(baseRequest, '1234')

    const titleInput = await screen.findByLabelText('Título')
    await user.clear(titleInput)
    await user.type(titleInput, 'Necesitamos más agua potable')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mockedVerify).not.toHaveBeenCalled(),
    )
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ resolveCode: '1234' }),
      ),
    )
  })

  it('muestra el error cuando el código verificado es incorrecto', async () => {
    mockedVerify.mockRejectedValue(new Error('Código de cierre incorrecto'))
    const user = userEvent.setup()
    renderPage()

    await user.type(
      await screen.findByLabelText('Código de cierre (4 dígitos)'),
      '9999',
    )
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Código de cierre incorrecto')
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios' }),
    ).not.toBeInTheDocument()
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