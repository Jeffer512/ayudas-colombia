import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { NewReport, Report } from '../lib/types'
import CreateReportPage from './CreateReportPage'

vi.mock('../api/client', () => ({
  api: {
    cities: vi.fn(),
    reports: vi.fn(),
    report: vi.fn(),
    createReport: vi.fn(),
    updateStatus: vi.fn(),
  },
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
}))

const mockedCities = vi.mocked(api.cities)
const mockedCreate = vi.mocked(api.createReport)

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/nuevo-reporte']}>
        <Routes>
          <Route path="/nuevo-reporte" element={<CreateReportPage />} />
          <Route path="/reporte/:id" element={<div>PAGINA DETALLE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreateReportPage', () => {
  beforeEach(() => {
    mockedCities.mockReset()
    mockedCreate.mockReset()
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

  it('publica un reporte de persona y navega al detalle', async () => {
    mockedCreate.mockResolvedValue({ id: 'new-1' } as Report)
    const user = userEvent.setup()
    renderPage()

    await screen.findByLabelText('Tipo de reporte')
    expect(screen.getByTestId('map')).toBeInTheDocument()

    await user.selectOptions(await screen.findByLabelText('Tipo de reporte'), 'supplies_request')
    await user.type(await screen.findByLabelText('Título'), 'Necesitamos agua potable hoy')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Las familias del sector requieren agua para cocinar y beber.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'María Gómez')
    await user.type(screen.getByLabelText('Teléfono de contacto'), '3158765432')
    await user.type(screen.getByLabelText('Dirección o referencia'), 'Calle 12 #4-50')

    await user.click(screen.getByRole('button', { name: 'Publicar reporte' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'supplies_request',
          title: 'Necesitamos agua potable hoy',
          cityCode: 'pereira',
          reporter: expect.objectContaining({
            contactType: 'individual',
            name: 'María Gómez',
            phone: '3158765432',
          }),
        }),
      ),
    )
    expect(await screen.findByText('PAGINA DETALLE')).toBeInTheDocument()
  })

  it('al elegir organización muestra y envía sus campos', async () => {
    mockedCreate.mockResolvedValue({ id: 'new-2' } as Report)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByLabelText('Organización'))

    const createdBody = new Promise<NewReport>((resolve) => {
      mockedCreate.mockImplementation(async (body: NewReport) => {
        resolve(body)
        return { id: 'new-2' } as Report
      })
    })

    await user.selectOptions(await screen.findByLabelText('Tipo de reporte'), 'shelter_offered')
    await user.type(screen.getByLabelText('Título'), 'Refugio disponible para familias')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Abrimos un refugio para familias que perdieron sus casas.',
    )
    await user.type(screen.getByLabelText('Nombre de la persona de contacto'), 'Carlos Ruiz')
    await user.type(screen.getByLabelText('Nombre de la organización'), 'Defensa Civil')
    await user.selectOptions(screen.getByLabelText('Tipo de organización'), 'government')
    await user.type(screen.getByLabelText('Teléfono de contacto'), '3120001111')

    await user.click(screen.getByRole('button', { name: 'Publicar reporte' }))

    const body = await createdBody
    expect(body.reporter).toMatchObject({
      contactType: 'organization',
      organizationName: 'Defensa Civil',
      organizationType: 'government',
    })

    expect(await screen.findByText('PAGINA DETALLE')).toBeInTheDocument()
  })

  it('muestra error del servidor si falla la publicación y no navega', async () => {
    mockedCreate.mockRejectedValue(new Error('Ciudad no encontrada: pereira'))
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo de reporte'), 'info')
    await user.type(screen.getByLabelText('Título'), 'Información del sector nororiental')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Hay un punto de distribución de agua funcionando en el sector.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Ana Torres')
    await user.type(screen.getByLabelText('Teléfono de contacto'), '3001112222')

    await user.click(screen.getByRole('button', { name: 'Publicar reporte' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ciudad no encontrada: pereira',
    )
    expect(screen.queryByText('PAGINA DETALLE')).not.toBeInTheDocument()
  })
})