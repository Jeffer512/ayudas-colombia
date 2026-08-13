import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { CreatedReport, NewReport } from '../lib/types'
import CreateReportPage from './CreateReportPage'

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
  Marker: () => null,
  Popup: () => null,
  useMapEvents: () => null,
}))

const mockedCities = vi.mocked(api.cities)
const mockedCreate = vi.mocked(api.createReport)

function renderPage(direction: 'need' | 'offer' | 'info' = 'need') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateReportPage direction={direction} />
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

  it('publica un pedido y muestra el código de cierre en pantalla', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-1',
      resolveCode: '4821',
    } as unknown as CreatedReport)
    const user = userEvent.setup()
    renderPage('need')

    await screen.findByLabelText('Tipo')
    expect(screen.getByTestId('map')).toBeInTheDocument()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_request')
    await user.type(await screen.findByLabelText('Título'), 'Necesitamos agua potable hoy')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Las familias del sector requieren agua para cocinar y beber.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'María Gómez')
    await user.type(screen.getByLabelText('Teléfono de contacto'), '3158765432')
    await user.type(screen.getByLabelText('Dirección o referencia'), 'Calle 12 #4-50')

    await user.click(screen.getByRole('button', { name: 'Publicar pedido' }))

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

    expect(
      await screen.findByRole('heading', { name: 'Reporte publicado' }),
    ).toBeInTheDocument()
    expect(screen.getByText('4821')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ver reporte en el mapa' }),
    ).toBeInTheDocument()
  })

  it('en modo ofrecer solo muestra tipos de oferta', async () => {
    const user = userEvent.setup()
    renderPage('offer')

    const typeSelect = await screen.findByLabelText('Tipo')

    const options = Array.from(
      typeSelect.querySelectorAll('option'),
    ).map((option) => option.textContent ?? '')
    expect(options).toContain('Ofrezco suministros')
    expect(options).toContain('Refugio ofrecido')
    expect(options).not.toContain('Solicitud de suministros')

    await user.selectOptions(typeSelect, 'shelter_offered')
    expect(
      (typeSelect as HTMLSelectElement).value,
    ).toBe('shelter_offered')
  })

  it('al elegir organización muestra y envía sus campos', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-2',
      resolveCode: '1234',
    } as unknown as CreatedReport)
    const user = userEvent.setup()
    renderPage('offer')

    await user.click(await screen.findByLabelText('Organización'))

    const createdBody = new Promise<NewReport>((resolve) => {
      mockedCreate.mockImplementation(async (body: NewReport) => {
        resolve(body)
        return { id: 'new-2', resolveCode: '1234' } as unknown as CreatedReport
      })
    })

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'shelter_offered')
    await user.type(screen.getByLabelText('Título'), 'Refugio disponible para familias')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Abrimos un refugio para familias que perdieron sus casas.',
    )
    await user.type(screen.getByLabelText('Nombre de la persona de contacto'), 'Carlos Ruiz')
    await user.type(screen.getByLabelText('Nombre de la organización'), 'Defensa Civil')
    await user.selectOptions(screen.getByLabelText('Tipo de organización'), 'government')
    await user.type(screen.getByLabelText('Teléfono de contacto'), '3120001111')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    const body = await createdBody
    expect(body.reporter).toMatchObject({
      contactType: 'organization',
      organizationName: 'Defensa Civil',
      organizationType: 'government',
    })

    expect(await screen.findByText('Reporte publicado')).toBeInTheDocument()
  })

  it('muestra error del servidor si falla la publicación y no muestra el código', async () => {
    mockedCreate.mockRejectedValue(new Error('Ciudad no encontrada: pereira'))
    const user = userEvent.setup()
    renderPage('info')

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'info')
    await user.type(screen.getByLabelText('Título'), 'Información del sector nororiental')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Hay un punto de distribución de agua funcionando en el sector.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Ana Torres')
    await user.type(screen.getByLabelText('Teléfono de contacto'), '3001112222')

    await user.click(screen.getByRole('button', { name: 'Publicar aviso' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ciudad no encontrada: pereira',
    )
    expect(screen.queryByText('Reporte publicado')).not.toBeInTheDocument()
  })
})