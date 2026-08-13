import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Report } from '../lib/types'
import ReportDetailPage from './ReportDetailPage'

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
  useMapEvents: () => null,
}))

const mockedReport = vi.mocked(api.report)
const mockedUpdateStatus = vi.mocked(api.updateStatus)

const baseReport: Report = {
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
    name: 'María Gómez',
    organizationName: null,
    organizationType: null,
    phone: '3158765432',
  },
  resolvedAt: null,
  createdAt: '2026-08-13T12:00:00Z',
  updatedAt: '2026-08-13T12:00:00Z',
  events: [
    {
      id: '1',
      status: 'open',
      note: 'Reporte creado',
      actorName: 'María Gómez',
      createdAt: '2026-08-13T12:00:00Z',
    },
  ],
}

function renderPage(report: Report = baseReport) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  mockedReport.mockResolvedValue(report)
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reporte/r1']}>
        <Routes>
          <Route path="/reporte/:id" element={<ReportDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ReportDetailPage', () => {
  beforeEach(() => {
    mockedReport.mockReset()
    mockedUpdateStatus.mockReset()
  })

  it('muestra la información completa del reporte', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Necesitamos agua potable' }),
    ).toBeInTheDocument()
    expect(screen.getByText('María Gómez')).toBeInTheDocument()
    expect(screen.getByText('3158765432')).toBeInTheDocument()
    expect(screen.getByText('Calle 12 #4-50')).toBeInTheDocument()
    expect(screen.getAllByText('Abierto').length).toBeGreaterThan(0)
    expect(screen.getByTestId('map')).toBeInTheDocument()
    expect(screen.getByText('Reporte creado')).toBeInTheDocument()
  })

  it('marca como siendo atendido y lo reporta al servidor', async () => {
    mockedUpdateStatus.mockResolvedValue({ ...baseReport, status: 'in_progress' })
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Marcarlo como siendo atendido' }),
    )
    await user.type(
      screen.getByLabelText('¿Quién está atendiendo? (opcional)'),
      'Cruz Roja',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith('r1', {
        status: 'in_progress',
        actorName: 'Cruz Roja',
        note: undefined,
      }),
    )
  })

  it('resuelve ingresando el código de cierre', async () => {
    mockedUpdateStatus.mockResolvedValue({ ...baseReport, status: 'resolved' })
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
})