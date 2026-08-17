import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { HelpOrg } from '../lib/types'
import HelpOrgDetailPage from './HelpOrgDetailPage'

vi.mock('../api/client', () => ({
  api: {
    helpOrg: vi.fn(),
    requests: vi.fn(),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

vi.mock('../components/ReportButton', () => ({
  __esModule: true,
  default: () => null,
}))

vi.mock('../components/RequestCard', () => ({
  __esModule: true,
  default: () => null,
}))

const mockedHelpOrg = vi.mocked(api.helpOrg)
const mockedRequests = vi.mocked(api.requests)

function org(managed: boolean): HelpOrg {
  return {
    id: 'o1',
    type: 'ciudadano',
    category: 'acopio',
    name: 'Centro La Florida',
    description: 'Punto de acopio del barrio.',
    address: 'Carrera 20 # 40-25',
    lat: 4.8133,
    lng: -75.6961,
    city: { code: 'pereira', name: 'Pereira' },
    contactName: null,
    contactPhone: null,
    hours: null,
    accepts: null,
    status: 'open',
    managed,
    createdAt: '2026-08-13T10:00:00Z',
    updatedAt: '2026-08-13T10:00:00Z',
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/organizacion/o1']}>
        <Routes>
          <Route path="/organizacion/:id" element={<HelpOrgDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HelpOrgDetailPage', () => {
  beforeEach(() => {
    mockedHelpOrg.mockReset()
    mockedRequests.mockReset()
    mockedRequests.mockResolvedValue({
      requests: [],
      total: 0,
      limit: 50,
      offset: 0,
    })
  })

  it('aclaración para organizaciones no gestionadas', async () => {
    mockedHelpOrg.mockResolvedValue(org(false))

    renderPage()

    expect(
      await screen.findByText(/publicada por un voluntario de la comunidad/i),
    ).toBeInTheDocument()
  })

  it('omite la aclaración en organizaciones gestionadas por su equipo', async () => {
    mockedHelpOrg.mockResolvedValue(org(true))

    renderPage()

    await screen.findByRole('heading', { name: 'Centro La Florida' })

    expect(
      screen.queryByText(/publicada por un voluntario de la comunidad/i),
    ).not.toBeInTheDocument()
  })
})
