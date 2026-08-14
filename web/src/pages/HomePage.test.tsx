import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type {
  AvisoListResponse,
  OfferListResponse,
  RequestListResponse,
} from '../lib/types'
import HomePage from './HomePage'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  useMapEvents: () => null,
}))

vi.mock('../api/client', () => ({
  api: {
    cities: vi.fn(),
    requests: vi.fn(),
    request: vi.fn(),
    createRequest: vi.fn(),
    updateRequestStatus: vi.fn(),
    offers: vi.fn(),
    offer: vi.fn(),
    createOffer: vi.fn(),
    updateOfferStatus: vi.fn(),
    avisos: vi.fn(),
    aviso: vi.fn(),
    createAviso: vi.fn(),
    markAviso: vi.fn(),
    markerId: vi.fn(),
    acopios: vi.fn(),
    acopio: vi.fn(),
    createAcopio: vi.fn(),
  },
}))

const mockedRequests = vi.mocked(api.requests)
const mockedOffers = vi.mocked(api.offers)
const mockedAvisos = vi.mocked(api.avisos)
const mockedCities = vi.mocked(api.cities)
const mockedAcopios = vi.mocked(api.acopios)

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const requestsResponse: RequestListResponse = {
  requests: [
    {
      id: 'r1',
      type: 'supplies_request',
      transport: null,
      urgency: 'high',
      status: 'open',
      title: 'Necesitamos agua potable',
      description: 'Familias de la cuadra requieren agua para cocinar.',
      address: 'Calle 12 #4-50',
      lat: 4.8133,
      lng: -75.6961,
      city: { code: 'pereira', name: 'Pereira' },
      reporter: {
        name: 'María',
        phone: '3158765432',
        whatsapp: null,
        email: null,
      },
      helpers: 0,
      resolvedAt: null,
      createdAt: '2026-08-13T12:00:00Z',
      updatedAt: '2026-08-13T12:00:00Z',
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
}

const offersResponse: OfferListResponse = {
  offers: [
    {
      id: 'o1',
      type: 'volunteers_offered',
      transport: null,
      status: 'open',
      title: 'Me ofrezco como voluntario',
      description: 'Puedo ayudar a repartir comida este fin de semana.',
      address: null,
      lat: null,
      lng: null,
      city: { code: 'pereira', name: 'Pereira' },
      reporter: {
        name: 'Laura',
        phone: '3100000000',
        whatsapp: null,
        email: null,
      },
      resolvedAt: null,
      createdAt: '2026-08-13T11:00:00Z',
      updatedAt: '2026-08-13T11:00:00Z',
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
}

const avisosResponse: AvisoListResponse = {
  avisos: [
    {
      id: 'a1',
      type: 'info',
      urgency: 'medium',
      status: 'open',
      title: 'Punto de agua funcionando',
      description: 'El parque principal reparte agua desde las 7am.',
      address: null,
      lat: 4.8135,
      lng: -75.6965,
      city: { code: 'pereira', name: 'Pereira' },
      reporter: {
        name: 'Nataly',
        phone: '3105551011',
        whatsapp: null,
        email: null,
      },
      marks: 1,
      createdAt: '2026-08-13T10:00:00Z',
      updatedAt: '2026-08-13T10:00:00Z',
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
}

describe('HomePage', () => {
  beforeEach(() => {
    mockedCities.mockReset()
    mockedRequests.mockReset()
    mockedOffers.mockReset()
    mockedAvisos.mockReset()
    mockedAcopios.mockReset()

    mockedCities.mockResolvedValue({
      cities: [
        {
          id: 1,
          code: 'pereira',
          name: 'Pereira',
          department: 'Risaralda',
          centerLat: 4.8133,
          centerLng: -75.6961,
        },
      ],
    })
    mockedAcopios.mockResolvedValue({ acopios: [], total: 0, limit: 50, offset: 0 })
  })

  it('muestra las tres secciones con sus conteos y listados', async () => {
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    expect(screen.getByText('Pedidos de ayuda')).toBeInTheDocument()
    expect(screen.getByText('Ofrecer ayuda')).toBeInTheDocument()
    expect(screen.getAllByText('Avisos').length).toBeGreaterThan(0)

    expect(
      await screen.findByRole('heading', { name: 'Necesitamos agua potable' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Me ofrezco como voluntario' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Punto de agua funcionando' }),
    ).toBeInTheDocument()

    expect(await screen.findAllByText('1 activo(s)')).not.toHaveLength(0)
  })

  it('solicita por defecto los activos de cada entidad', async () => {
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    await waitFor(() =>
      expect(mockedRequests).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      ),
    )
    expect(mockedOffers).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    )
    expect(mockedAvisos).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    )
  })

  it('filtra los pedidos por estado', async () => {
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    const statusSelect = await screen.findByLabelText('Filtrar pedidos por estado')
    await userEvent.selectOptions(statusSelect, 'resolved')

    await waitFor(() =>
      expect(mockedRequests).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'resolved' }),
      ),
    )
  })

  it('muestra el estado vacío de pedidos', async () => {
    mockedRequests.mockResolvedValue({ requests: [], total: 0, limit: 50, offset: 0 })
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    expect(
      await screen.findByText('No hay pedidos con estos filtros'),
    ).toBeInTheDocument()
  })

  it('muestra error y botón para reintentar en pedidos', async () => {
    mockedRequests.mockRejectedValue(new Error('boom'))
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    expect(
      await screen.findByText('No pudimos cargar los pedidos'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument()
  })

  it('muestra el mapa con los cuatro controles de capas', async () => {
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    expect(await screen.findByTestId('map')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar Necesito ayuda' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar Ofrecer' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar Avisos' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar Centros' }),
    ).toBeInTheDocument()
  })
})
