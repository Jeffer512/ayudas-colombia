import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Request } from '../lib/types'
import RequestDetailPage from './RequestDetailPage'

vi.mock('../api/client', () => ({
  api: {
    request: vi.fn(),
    updateRequestStatus: vi.fn(),
    helpRequest: vi.fn(),
    markerId: vi.fn(() => 'device-abc'),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

const mockedRequest = vi.mocked(api.request)
const mockedUpdateStatus = vi.mocked(api.updateRequestStatus)
const mockedHelpRequest = vi.mocked(api.helpRequest)

const baseRequest: Request = {
  id: 'r1',
  type: 'supplies_request',
  transport: null,
  items: ['Agua', 'Comida'],
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
  helpers: 0,
  resolvedAt: null,
  createdAt: '2026-08-13T12:00:00Z',
  updatedAt: '2026-08-13T12:00:00Z',
  events: [
    {
      id: '1',
      status: 'open',
      note: 'Pedido creado',
      actorName: 'María Gómez',
      createdAt: '2026-08-13T12:00:00Z',
    },
  ],
}

function renderPage(request: Request = baseRequest) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  mockedRequest.mockResolvedValue(request)
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pedido/r1']}>
        <Routes>
          <Route path="/pedido/:id" element={<RequestDetailPage />} />
          <Route path="/pedido/:id/editar" element={<div>EDITAR_PEDIDO</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RequestDetailPage', () => {
  beforeEach(() => {
    mockedRequest.mockReset()
    mockedUpdateStatus.mockReset()
    mockedHelpRequest.mockReset()
  })

  it('muestra la información completa del pedido', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Necesitamos agua potable' }),
    ).toBeInTheDocument()
    expect(screen.getByText('María Gómez')).toBeInTheDocument()
    expect(screen.getByText('3158765432')).toBeInTheDocument()
    expect(screen.getByText('Calle 12 #4-50')).toBeInTheDocument()
    expect(screen.getAllByText('Abierto').length).toBeGreaterThan(0)
    expect(screen.getByTestId('map')).toBeInTheDocument()
    expect(screen.getByText('Pedido creado')).toBeInTheDocument()
  })

  it('muestra la lista de ítems que se necesitan', async () => {
    renderPage()

    expect(await screen.findByText('Agua')).toBeInTheDocument()
    expect(screen.getByText('Comida')).toBeInTheDocument()
  })

  it('no muestra la lista de ítems cuando está vacía', async () => {
    renderPage({ ...baseRequest, items: [] })

    expect(await screen.findByRole('heading', { name: 'Necesitamos agua potable' }))
      .toBeInTheDocument()
    expect(screen.queryByText('Agua')).not.toBeInTheDocument()
  })

  it('registra que una persona va a ayudar', async () => {
    mockedHelpRequest.mockResolvedValue({
      ...baseRequest,
      helpers: 2,
      helperList: [{ name: 'Camila', note: 'Llevo agua', createdAt: '2026-08-14T10:00:00Z' }],
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Voy a ayudar' }))
    await user.type(screen.getByLabelText('Tu nombre (opcional)'), 'Camila')
    await user.type(
      screen.getByLabelText('¿Qué vas a aportar? (opcional)'),
      'Llevo agua',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(mockedHelpRequest).toHaveBeenCalledWith('r1', {
        markerId: 'device-abc',
        name: 'Camila',
        note: 'Llevo agua',
      }),
    )
    expect(
      await screen.findByText('Ya estás ayudando en este pedido'),
    ).toBeInTheDocument()
  })

  it('muestra el conteo de ayudas y la lista de quienes ayudan', async () => {
    renderPage({
      ...baseRequest,
      helpers: 2,
      helperList: [
        { name: 'Camila', note: 'Llevo agua', createdAt: '2026-08-14T10:00:00Z' },
        { name: null, note: null, createdAt: '2026-08-14T11:00:00Z' },
      ],
    })

    expect(
      await screen.findByText('2 personas están ayudando'),
    ).toBeInTheDocument()
    expect(screen.getByText('Camila')).toBeInTheDocument()
    expect(screen.getByText('Llevo agua')).toBeInTheDocument()
    expect(screen.getByText('Alguien')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Voy a ayudar' }),
    ).toBeInTheDocument()
  })

  it('el dueño ve la nota y no puede ayudarse a sí mismo', async () => {
    renderPage({ ...baseRequest, isOwner: true, helpers: 1 })

    expect(
      await screen.findByText(
        'Tú creaste este pedido. Los demás pueden registrarse aquí para ayudarte.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('1 persona está ayudando')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Voy a ayudar' }),
    ).not.toBeInTheDocument()
  })

  it('resuelve ingresando el código de cierre', async () => {
    mockedUpdateStatus.mockResolvedValue({ ...baseRequest, status: 'resolved' })
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Marcarlo como resuelto' }),
    )
    await user.type(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
      '5432',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar resolución' }))

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith('r1', {
        status: 'resolved',
        resolveCode: '5432',
        note: undefined,
      }),
    )
  })

  it('muestra el error cuando el código de cierre es incorrecto', async () => {
    mockedUpdateStatus.mockRejectedValue(
      new Error('Código de cierre incorrecto'),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Marcarlo como resuelto' }),
    )
    await user.type(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
      '0000',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar resolución' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Código de cierre incorrecto',
    )
  })

  it('no reabre de un clic: pide el código de cierre', async () => {
    const user = userEvent.setup()
    renderPage({
      ...baseRequest,
      status: 'resolved',
      resolvedAt: '2026-08-14T10:00:00Z',
    })

    await user.click(await screen.findByRole('button', { name: 'Reabrir pedido' }))

    expect(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
    ).toBeInTheDocument()
    expect(mockedUpdateStatus).not.toHaveBeenCalled()
  })

  it('el dueño resuelve sin pedir el código de cierre', async () => {
    mockedUpdateStatus.mockResolvedValue({
      ...baseRequest,
      isOwner: true,
      status: 'resolved',
    })
    const user = userEvent.setup()
    renderPage({ ...baseRequest, isOwner: true })

    await user.click(
      await screen.findByRole('button', { name: 'Marcarlo como resuelto' }),
    )

    expect(
      screen.queryByLabelText('Código de cierre (4 dígitos)'),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Confirmar resolución' }),
    )

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith('r1', {
        status: 'resolved',
        note: undefined,
      }),
    )
    expect(mockedUpdateStatus.mock.calls[0][1]).not.toHaveProperty('resolveCode')
  })

  it('el dueño reabre sin pedir el código de cierre', async () => {
    mockedUpdateStatus.mockResolvedValue({ ...baseRequest, isOwner: true })
    const user = userEvent.setup()
    renderPage({
      ...baseRequest,
      isOwner: true,
      status: 'resolved',
      resolvedAt: '2026-08-14T10:00:00Z',
    })

    await user.click(await screen.findByRole('button', { name: 'Reabrir pedido' }))

    expect(
      screen.queryByLabelText('Código de cierre (4 dígitos)'),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Confirmar reapertura' }),
    )

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith('r1', {
        status: 'open',
        note: 'Reabierto',
      }),
    )
  })

  it('reabre un pedido ingresando el código de cierre', async () => {
    mockedUpdateStatus.mockResolvedValue({ ...baseRequest, status: 'open' })
    const user = userEvent.setup()
    renderPage({
      ...baseRequest,
      status: 'resolved',
      resolvedAt: '2026-08-14T10:00:00Z',
    })

    await user.click(await screen.findByRole('button', { name: 'Reabrir pedido' }))
    await user.type(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
      '1234',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar reapertura' }))

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith('r1', {
        status: 'open',
        note: 'Reabierto',
        resolveCode: '1234',
      }),
    )
  })

  it('muestra el botón para editar en pedidos abiertos sin ayudantes', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Editar pedido' }),
    )

    expect(await screen.findByText('EDITAR_PEDIDO')).toBeInTheDocument()
  })

  it('oculta el botón para editar cuando ya hay personas ayudando', async () => {
    renderPage({ ...baseRequest, helpers: 2 })

    expect(
      await screen.findByText('2 personas están ayudando'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Editar pedido' }),
    ).not.toBeInTheDocument()
  })

  it('oculta el botón para editar en un pedido cerrado', async () => {
    renderPage({ ...baseRequest, status: 'resolved', resolvedAt: '2026-08-14T10:00:00Z' })

    expect(
      await screen.findByRole('button', { name: 'Reabrir pedido' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Editar pedido' }),
    ).not.toBeInTheDocument()
  })
})