import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  useMap: () => ({ flyTo: () => undefined, getZoom: () => 13 }),
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
    helpOrgs: vi.fn(),
  },
}))

const mockedRequests = vi.mocked(api.requests)
const mockedOffers = vi.mocked(api.offers)
const mockedAvisos = vi.mocked(api.avisos)
const mockedCities = vi.mocked(api.cities)
const mockedHelpOrgs = vi.mocked(api.helpOrgs)
const { mockedGetPosition } = vi.hoisted(() => ({ mockedGetPosition: vi.fn() }))

vi.mock('../lib/geo', async (importOriginal) => ({
  ...(await importOriginal()),
  getPosition: mockedGetPosition,
}))

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
      items: [],
      zone: null,
      destination: { type: 'anywhere' },
      volunteer: {
        capabilities: ['Repartir comida'],
        availability: 'Fines de semana',
      },
      vehicle: null,
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
      claim: null,
      canClaim: false,
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
    window.localStorage.clear()
    mockedCities.mockReset()
    mockedRequests.mockReset()
    mockedOffers.mockReset()
    mockedAvisos.mockReset()
    mockedHelpOrgs.mockReset()
    mockedGetPosition.mockReset()

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
    mockedHelpOrgs.mockResolvedValue({ helpOrgs: [], total: 0, limit: 50, offset: 0 })
    mockedGetPosition.mockRejectedValue(new Error('sin permiso de ubicación'))
  })

  it('muestra las tres secciones con sus conteos y listados', async () => {
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    expect(screen.getByText('Pedidos de ayuda')).toBeInTheDocument()
    expect(screen.getAllByText('Ofrecer ayuda').length).toBeGreaterThan(0)
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

  it('muestra los enlaces de publicación en las secciones', async () => {
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    expect((await screen.findAllByText('1 activo(s)')).length).toBe(3)
    const publishRequest = screen.getByRole('link', { name: '+ Publicar pedido' })
    const publishOffer = screen.getByRole('link', { name: '+ Publicar oferta' })
    const publishAviso = screen.getByRole('link', { name: '+ Publicar aviso' })
    expect(publishRequest).toHaveAttribute('href', '/pedir-ayuda')
    expect(publishOffer).toHaveAttribute('href', '/ofrecer-ayuda')
    expect(publishAviso).toHaveAttribute('href', '/informar')
  })

  it('muestra los accesos rápidos del encabezado', async () => {
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    await screen.findByRole('heading', { name: 'Ayuda en Pereira' })
    expect(screen.getByRole('link', { name: 'Necesito ayuda' })).toHaveAttribute(
      'href',
      '/pedir-ayuda',
    )
    expect(screen.getByRole('link', { name: 'Ofrecer ayuda' })).toHaveAttribute(
      'href',
      '/ofrecer-ayuda',
    )
    expect(screen.getByRole('link', { name: 'Transportar' })).toHaveAttribute(
      'href',
      '/transporte',
    )
    expect(screen.getByRole('link', { name: 'Publicar una organización' })).toHaveAttribute(
      'href',
      '/nuevo-centro',
    )
  })

  it('muestra los accesos directos del encabezado', async () => {
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    await screen.findByRole('heading', { name: 'Ayuda en Pereira' })
    const chips: [string, string][] = [
      ['Donar suministros', '/ofrecer-ayuda?tipo=supplies_offered'],
      ['Ser voluntario', '/ofrecer-ayuda?tipo=volunteers_offered'],
      ['Pedir suministros', '/pedir-ayuda?tipo=supplies_request'],
      ['Ver red de ayudas', '/red-de-ayudas'],
    ]
    for (const [label, href] of chips) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
    }
  })

  it('muestra el CTA de publicación en el estado vacío de pedidos', async () => {
    mockedRequests.mockResolvedValue({ requests: [], total: 0, limit: 50, offset: 0 })
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    expect(
      await screen.findByText('No hay pedidos con estos filtros'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Publicar el primero' })).toHaveAttribute(
      'href',
      '/pedir-ayuda',
    )
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
      screen.getByRole('checkbox', { name: 'Mostrar Ofrezo ayuda' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar Avisos' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar Red de ayudas' }),
    ).toBeInTheDocument()
  })

  it('centra el mapa en la ciudad elegida y actualiza el encabezado', async () => {
    mockedCities.mockResolvedValue({
      cities: [
        { id: 1, code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8133, centerLng: -75.6961 },
        { id: 2, code: 'manizales', name: 'Manizales', department: 'Caldas', centerLat: 5.0689, centerLng: -75.5174 },
      ],
    })
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    const citySelect = screen.getByLabelText('Centrar el mapa en')
    await within(citySelect).findByRole('option', { name: 'Manizales' })
    await userEvent.selectOptions(citySelect, 'manizales')

    expect(
      screen.getByRole('heading', { name: 'Ayuda en Manizales' }),
    ).toBeInTheDocument()
    expect(citySelect).toHaveValue('manizales')
    expect(window.localStorage.getItem('ayudas_map_city')).toBe('manizales')
  })

  it('centra el mapa en la ciudad detectada por el navegador cuando no hay una elección previa', async () => {
    mockedCities.mockResolvedValue({
      cities: [
        { id: 1, code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8133, centerLng: -75.6961 },
        { id: 2, code: 'manizales', name: 'Manizales', department: 'Caldas', centerLat: 5.0689, centerLng: -75.5174 },
      ],
    })
    mockedGetPosition.mockResolvedValue({ lat: 5.0689, lng: -75.5174 })
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    const citySelect = await screen.findByLabelText('Centrar el mapa en')
    await waitFor(() => expect(citySelect).toHaveValue('manizales'))
    expect(mockedGetPosition).toHaveBeenCalled()
  })

  it('ignora la detección por el navegador cuando ya hay una ciudad guardada', async () => {
    window.localStorage.setItem('ayudas_map_city', 'pereira')
    mockedGetPosition.mockResolvedValue({ lat: 3.4516, lng: -76.532 })
    mockedCities.mockResolvedValue({
      cities: [
        { id: 1, code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8133, centerLng: -75.6961 },
        { id: 3, code: 'cali', name: 'Cali', department: 'Valle del Cauca', centerLat: 3.4516, centerLng: -76.532 },
      ],
    })
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    const citySelect = screen.getByLabelText('Centrar el mapa en')
    await within(citySelect).findByRole('option', { name: 'Pereira' })
    expect(citySelect).toHaveValue('pereira')
    expect(mockedGetPosition).not.toHaveBeenCalled()
  })

  it('usa la ciudad por defecto cuando se niega la ubicación', async () => {
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    await waitFor(() => expect(mockedGetPosition).toHaveBeenCalled())
    expect(
      screen.getByRole('heading', { name: 'Ayuda en Pereira' }),
    ).toBeInTheDocument()
  })

  it('muestra la sección de organizaciones con sus tarjetas', async () => {
    mockedHelpOrgs.mockResolvedValue({
      helpOrgs: [
        {
          id: 'org-1',
          type: 'ciudadano',
          category: 'acopio',
          name: 'Centro de acopio del barrio',
          description: 'Recibimos agua y alimentos.',
          address: null,
          lat: 4.8,
          lng: -75.69,
          city: { code: 'pereira', name: 'Pereira' },
          contactName: null,
          contactPhone: null,
          hours: null,
          accepts: null,
          status: 'open',
          managed: false,
          items: [],
          createdAt: '2026-08-10T00:00:00.000Z',
          updatedAt: '2026-08-10T00:00:00.000Z',
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    })
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    expect(
      await screen.findByRole('heading', { name: 'Centro de acopio del barrio' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver todas/i })).toHaveAttribute(
      'href',
      '/red-de-ayudas',
    )
    expect(screen.getAllByText('1 activo(s)')).toHaveLength(4)
  })

  it('filtra las organizaciones por categoría', async () => {
    mockedHelpOrgs.mockResolvedValue({ helpOrgs: [], total: 0, limit: 50, offset: 0 })
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)
    const user = userEvent.setup()

    renderHomePage()

    await user.selectOptions(
      await screen.findByLabelText('Filtrar por categoría'),
      'acopio',
    )

    await waitFor(() =>
      expect(mockedHelpOrgs).toHaveBeenLastCalledWith({
        status: 'open',
        category: 'acopio',
      }),
    )
  })

  it('filtra las organizaciones por la ciudad seleccionada en el mapa', async () => {
    mockedCities.mockResolvedValue({
      cities: [
        { id: 1, code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8133, centerLng: -75.6961 },
        { id: 2, code: 'armenia', name: 'Armenia', department: 'Quindío', centerLat: 4.5339, centerLng: -75.6811 },
      ],
    })
    window.localStorage.setItem('ayudas_map_city', 'armenia')
    mockedRequests.mockResolvedValue(requestsResponse)
    mockedOffers.mockResolvedValue(offersResponse)
    mockedAvisos.mockResolvedValue(avisosResponse)

    renderHomePage()

    await waitFor(() =>
      expect(mockedHelpOrgs).toHaveBeenCalledWith({
        status: 'open',
        city: 'armenia',
      }),
    )
  })
})
