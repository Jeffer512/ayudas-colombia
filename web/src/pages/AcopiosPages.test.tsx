import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AcopioCenter } from '../lib/types'
import AcopioDetailPage from './AcopioDetailPage'
import AcopiosPage from './AcopiosPage'
import NewCenterPage from './NewCenterPage'

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

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: ({
    onPick,
    marker,
  }: {
    onPick?: (lat: number, lng: number) => void
    marker?: { lat: number; lng: number } | null
  }) => (
    <div data-testid="map">
      <button onClick={() => onPick?.(4.8133, -75.6961)}>PICK</button>
      <span>{marker ? 'con punto' : 'sin punto'}</span>
    </div>
  ),
}))

const mockedCities = vi.mocked(api.cities)
const mockedAcopios = vi.mocked(api.acopios)
const mockedAcopio = vi.mocked(api.acopio)
const mockedCreateAcopio = vi.mocked(api.createAcopio)

const center: AcopioCenter = {
  id: 'a1',
  type: 'ciudadano',
  name: 'Centro La Florida',
  description: 'Recibimos agua, comida y ropa.',
  address: 'Carrera 20 #40-25',
  lat: 4.8133,
  lng: -75.6961,
  city: { code: 'pereira', name: 'Pereira' },
  contactName: 'María',
  contactPhone: '3105552222',
  hours: '8am - 6pm',
  accepts: 'Agua, alimentos no perecederos',
  status: 'open',
  createdAt: '2026-08-13T12:00:00Z',
  updatedAt: '2026-08-13T12:00:00Z',
}

const cities = [
  {
    id: 1,
    code: 'pereira',
    name: 'Pereira',
    department: 'Risaralda',
    centerLat: 4.8133,
    centerLng: -75.6961,
  },
]

function renderWith(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe('AcopiosPage', () => {
  beforeEach(() => {
    mockedCities.mockReset()
    mockedAcopios.mockReset()
    mockedCities.mockResolvedValue({ cities })
  })

  it('lista los centros de acopio con su conteo', async () => {
    mockedAcopios.mockResolvedValue({
      acopios: [center],
      total: 1,
      limit: 50,
      offset: 0,
    })
    renderWith(
      <MemoryRouter>
        <AcopiosPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Centros de acopio' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: /Centro La Florida/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/1 centro\(s\)/)).toBeInTheDocument()
    expect(screen.getByText('Abierto')).toBeInTheDocument()
  })

  it('muestra el estado vacío y sugiere publicar el primero', async () => {
    mockedAcopios.mockResolvedValue({
      acopios: [],
      total: 0,
      limit: 50,
      offset: 0,
    })
    renderWith(
      <MemoryRouter>
        <AcopiosPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('Todavía no hay centros de acopio'),
    ).toBeInTheDocument()
  })

  it('muestra error en la carga de centros', async () => {
    mockedAcopios.mockRejectedValue(new Error('boom'))
    renderWith(
      <MemoryRouter>
        <AcopiosPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('No pudimos cargar los centros'),
    ).toBeInTheDocument()
  })
})

describe('AcopioDetailPage', () => {
  beforeEach(() => {
    mockedAcopio.mockReset()
  })

  it('muestra la información completa del centro y su ubicación', async () => {
    mockedAcopio.mockResolvedValue(center)
    renderWith(
      <MemoryRouter initialEntries={['/centro/a1']}>
        <Routes>
          <Route path="/centro/:id" element={<AcopioDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Centro La Florida' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Recibimos agua/)).toBeInTheDocument()
    expect(screen.getByText('María')).toBeInTheDocument()
    expect(screen.getByText('3105552222')).toBeInTheDocument()
    expect(screen.getByText(/8am - 6pm/)).toBeInTheDocument()
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })

  it('muestra error cuando no existe el centro', async () => {
    mockedAcopio.mockRejectedValue(new Error('Centro no encontrado'))
    renderWith(
      <MemoryRouter initialEntries={['/centro/nope']}>
        <Routes>
          <Route path="/centro/:id" element={<AcopioDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('No encontramos este centro de acopio'),
    ).toBeInTheDocument()
  })
})

describe('NewCenterPage', () => {
  beforeEach(() => {
    mockedCities.mockReset()
    mockedCreateAcopio.mockReset()
    mockedCities.mockResolvedValue({ cities })
  })

  it('exige marcar el punto en el mapa antes de publicar', async () => {
    const user = userEvent.setup()
    renderWith(
      <MemoryRouter initialEntries={['/nuevo-centro']}>
        <Routes>
          <Route path="/nuevo-centro" element={<NewCenterPage />} />
          <Route path="/centro/:id" element={<div>PAGINA CENTRO</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(
      await screen.findByLabelText('Nombre del centro'),
      'Centro La Florida',
    )
    await user.click(screen.getByRole('button', { name: 'Publicar centro' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Marca en el mapa el punto donde está el centro de acopio.',
    )
    expect(mockedCreateAcopio).not.toHaveBeenCalled()
  })

  it('publica el centro y navega al detalle', async () => {
    mockedCreateAcopio.mockResolvedValue(center)
    const user = userEvent.setup()
    renderWith(
      <MemoryRouter initialEntries={['/nuevo-centro']}>
        <Routes>
          <Route path="/nuevo-centro" element={<NewCenterPage />} />
          <Route path="/centro/:id" element={<div>PAGINA CENTRO</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(
      await screen.findByLabelText('Nombre del centro'),
      'Centro La Florida',
    )
    await user.type(
      screen.getByLabelText('Teléfono de contacto'),
      '3105552222',
    )
    await user.click(screen.getByText('PICK'))

    await user.click(screen.getByRole('button', { name: 'Publicar centro' }))

    await waitFor(() =>
      expect(mockedCreateAcopio).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Centro La Florida',
          lat: 4.8133,
          lng: -75.6961,
          cityCode: 'pereira',
          contactPhone: '3105552222',
        }),
      ),
    )
    expect(await screen.findByText('PAGINA CENTRO')).toBeInTheDocument()
  })
})