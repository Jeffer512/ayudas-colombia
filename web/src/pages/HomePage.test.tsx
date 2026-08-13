import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { ReportListResponse } from '../lib/types'
import HomePage from './HomePage'

vi.mock('../api/client', () => ({
  api: {
    cities: vi.fn(),
    reports: vi.fn(),
    report: vi.fn(),
    createReport: vi.fn(),
    updateStatus: vi.fn(),
    acopios: vi.fn(),
    acopio: vi.fn(),
    createAcopio: vi.fn(),
  },
}))

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

const mockedReports = vi.mocked(api.reports)
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

const listResponse: ReportListResponse = {
  reports: [
    {
      id: 'r1',
      direction: 'need',
      type: 'supplies_request',
      urgency: 'high',
      status: 'open',
      title: 'Necesitamos agua potable',
      description: 'Familias de la cuadra requieren agua para cocinar.',
      address: 'Calle 12 #4-50',
      lat: 4.8133,
      lng: -75.6961,
      city: { code: 'pereira', name: 'Pereira' },
      reporter: {
        contactType: 'individual',
        name: 'María',
        organizationName: null,
        organizationType: null,
        phone: '3158765432',
      },
      resolvedAt: null,
      createdAt: '2026-08-13T12:00:00Z',
      updatedAt: '2026-08-13T12:00:00Z',
    },
    {
      id: 'r2',
      direction: 'offer',
      type: 'volunteers_request',
      urgency: 'medium',
      status: 'in_progress',
      title: 'Voluntarios para el albergue',
      description: 'Se necesita gente para repartir comida.',
      address: null,
      lat: null,
      lng: null,
      city: { code: 'pereira', name: 'Pereira' },
      reporter: {
        contactType: 'organization',
        name: 'Laura',
        organizationName: 'Cruz Roja',
        organizationType: 'ngojs',
        phone: '3100000000',
      },
      resolvedAt: null,
      createdAt: '2026-08-13T11:00:00Z',
      updatedAt: '2026-08-13T11:30:00Z',
    },
  ],
  total: 2,
  limit: 50,
  offset: 0,
}

describe('HomePage', () => {
  beforeEach(() => {
    mockedCities.mockReset()
    mockedReports.mockReset()
    mockedAcopios.mockReset()
    mockedAcopios.mockResolvedValue({ acopios: [], total: 0, limit: 50, offset: 0 })
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
  })

  it('muestra los reportes cargados con sus estados', async () => {
    mockedReports.mockResolvedValue(listResponse)
    renderHomePage()

    expect(screen.getByRole('status')).toBeInTheDocument()

    expect(
      await screen.findByRole('heading', { name: 'Necesitamos agua potable' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Voluntarios para el albergue' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Abierto').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Siendo atendido').length).toBeGreaterThan(0)
    expect(screen.getByText('2 reporte(s)')).toBeInTheDocument()
  })

  it('solicita el filtro por defecto de reportes activos', async () => {
    mockedReports.mockResolvedValue(listResponse)
    renderHomePage()

    await waitFor(() =>
      expect(mockedReports).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' })),
    )
  })

  it('filtra por estado al cambiarlo en el selector', async () => {
    mockedReports.mockResolvedValue(listResponse)
    renderHomePage()

    const statusSelect = await screen.findByLabelText('Filtrar por estado')
    await userEvent.selectOptions(statusSelect, 'resolved')

    await waitFor(() =>
      expect(mockedReports).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'resolved' }),
      ),
    )
  })

  it('muestra el estado vacío cuando no hay coincidencias', async () => {
    mockedReports.mockResolvedValue({ reports: [], total: 0, limit: 50, offset: 0 })
    renderHomePage()

    expect(
      await screen.findByText('No hay reportes con estos filtros'),
    ).toBeInTheDocument()
  })

  it('muestra error y botón para reintentar', async () => {
    mockedReports.mockRejectedValue(new Error('boom'))
    renderHomePage()

    expect(
      await screen.findByText('No pudimos cargar los reportes'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument()
  })

  it('muestra el mapa con los controles de capas y los centros de acopio', async () => {
    mockedReports.mockResolvedValue(listResponse)
    mockedAcopios.mockResolvedValue({
      acopios: [
        {
          id: 'a1',
          type: 'ciudadano',
          name: 'Centro La Florida',
          description: null,
          address: 'Carrera 20 #40-25',
          lat: 4.82,
          lng: -75.7,
          city: { code: 'pereira', name: 'Pereira' },
          contactName: null,
          contactPhone: '3105552222',
          hours: null,
          accepts: null,
          status: 'open',
          createdAt: '2026-08-13T12:00:00Z',
          updatedAt: '2026-08-13T12:00:00Z',
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    })
    renderHomePage()

    expect(await screen.findByTestId('map')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar reportes' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar centros de acopio' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Necesito ayuda')).toBeInTheDocument()
    expect(await screen.findByText('Centro La Florida')).toBeInTheDocument()
  })
})