import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Offer, OfferListResponse } from '../lib/types'
import TransportHubPage from './TransportHubPage'

vi.mock('../api/client', () => ({
  api: {
    offers: vi.fn(),
    me: vi.fn(),
    claimOffer: vi.fn(),
  },
}))

const mockedOffers = vi.mocked(api.offers)
const mockedMe = vi.mocked(api.me)
const mockedClaim = vi.mocked(api.claimOffer)

const transportOffer: Offer = {
  id: 'o1',
  type: 'supplies_offered',
  transport: 'needs_transport',
  status: 'open',
  title: 'Ofrezco 100 kits de aseo',
  description: 'Kits de aseo listos en la bodega para entregar.',
  address: 'Bodega Distrisalud, km 5',
  lat: 4.8203,
  lng: -75.7205,
  city: { code: 'pereira', name: 'Pereira' },
  reporter: {
    name: 'Carmen Vila',
    phone: '3105552222',
    whatsapp: null,
    email: null,
  },
  claim: null,
  canClaim: true,
  resolvedAt: null,
  createdAt: '2026-08-13T12:00:00Z',
  updatedAt: '2026-08-13T12:00:00Z',
}

const hubResponse: OfferListResponse = {
  offers: [transportOffer],
  total: 1,
  limit: 50,
  offset: 0,
}

function renderHub() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TransportHubPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TransportHubPage', () => {
  beforeEach(() => {
    mockedOffers.mockReset()
    mockedMe.mockReset()
    mockedClaim.mockReset()
    mockedOffers.mockResolvedValue(hubResponse)
  })

  it('pide solo las ofertas del centro de carga', async () => {
    renderHub()

    await waitFor(() =>
      expect(mockedOffers).toHaveBeenCalledWith({ forTransport: true }),
    )
  })

  it('muestra las cargas disponibles con botón para comprometerse', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      staff: { id: 'm1', userId: 'u1', email: 'v@correo.org', name: 'Voluntaria', role: 'member', orgId: 'org-1', status: 'active' },
    })
    renderHub()

    expect(
      await screen.findByRole('heading', { name: 'Centro de carga' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Ofrezco 100 kits de aseo'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Me comprometo a llevarla' }),
    ).toBeInTheDocument()
  })

  it('reserva la oferta al hacer clic en el botón', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      staff: { id: 'm1', userId: 'u1', email: 'v@correo.org', name: 'Voluntaria', role: 'member', orgId: 'org-1', status: 'active' },
    })
    mockedClaim.mockResolvedValue({ ...transportOffer, status: 'in_transit' })
    const user = userEvent.setup()
    renderHub()

    await user.click(
      await screen.findByRole('button', { name: 'Me comprometo a llevarla' }),
    )

    await waitFor(() => expect(mockedClaim).toHaveBeenCalledWith('o1'))
  })

  it('pide iniciar sesión cuando no hay usuario', async () => {
    mockedMe.mockResolvedValue({ authenticated: false, staff: null })
    renderHub()

    expect(
      await screen.findByRole('link', { name: 'Inicia sesión para llevarla' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Me comprometo a llevarla' }),
    ).not.toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay cargas', async () => {
    mockedMe.mockResolvedValue({ authenticated: false, staff: null })
    mockedOffers.mockResolvedValue({ offers: [], total: 0, limit: 50, offset: 0 })
    renderHub()

    expect(
      await screen.findByText('No hay suministros esperando transporte'),
    ).toBeInTheDocument()
  })
})
