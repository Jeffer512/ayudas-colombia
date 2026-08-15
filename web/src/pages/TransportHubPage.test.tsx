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
    cancelClaim: vi.fn(),
  },
}))

const mockedOffers = vi.mocked(api.offers)
const mockedMe = vi.mocked(api.me)
const mockedClaim = vi.mocked(api.claimOffer)
const mockedCancel = vi.mocked(api.cancelClaim)

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

const assignedOffer: Offer = {
  ...transportOffer,
  id: 'o2',
  title: 'Colchonetas y cobijas',
  status: 'in_transit',
  canClaim: false,
  claim: {
    id: 'c1',
    status: 'committed',
    claimerName: 'Voluntaria',
    mine: true,
    note: null,
    claimedAt: '2026-08-13T12:00:00Z',
  },
}

const hubResponse: OfferListResponse = {
  offers: [transportOffer],
  total: 1,
  limit: 50,
  offset: 0,
}

const assignedResponse: OfferListResponse = {
  offers: [assignedOffer],
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

const loggedInMe: Awaited<ReturnType<typeof api.me>> = {
  authenticated: true,
  name: 'Voluntaria',
  email: 'v@correo.org',
  staff: {
    id: 'm1',
    userId: 'u1',
    email: 'v@correo.org',
    name: 'Voluntaria',
    role: 'member',
    orgId: 'org-1',
    status: 'active',
  },
}

function mockList() {
  mockedOffers.mockImplementation((filters) =>
    Promise.resolve(
      filters?.forTransport === 'assigned' ? assignedResponse : hubResponse,
    ),
  )
}

describe('TransportHubPage', () => {
  beforeEach(() => {
    mockedOffers.mockReset()
    mockedMe.mockReset()
    mockedClaim.mockReset()
    mockedCancel.mockReset()
    mockList()
  })

  it('pide las ofertas pendientes y las comprometidas', async () => {
    renderHub()

    await waitFor(() =>
      expect(mockedOffers).toHaveBeenCalledWith({ forTransport: true }),
    )
    await waitFor(() =>
      expect(mockedOffers).toHaveBeenCalledWith({ forTransport: 'assigned' }),
    )
  })

  it('muestra las cargas disponibles con botón para comprometerse', async () => {
    mockedMe.mockResolvedValue(loggedInMe)
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
    mockedMe.mockResolvedValue(loggedInMe)
    mockedClaim.mockResolvedValue({ ...transportOffer, status: 'in_transit' })
    const user = userEvent.setup()
    renderHub()

    await user.click(
      await screen.findByRole('button', { name: 'Me comprometo a llevarla' }),
    )

    await waitFor(() => expect(mockedClaim).toHaveBeenCalledWith('o1'))
  })

  it('muestra las cargas comprometidas y el botón para cancelar el propio compromiso', async () => {
    mockedMe.mockResolvedValue(loggedInMe)
    mockedCancel.mockResolvedValue({
      ...assignedOffer,
      status: 'open',
      claim: null,
      canClaim: true,
    })
    const user = userEvent.setup()
    renderHub()

    expect(
      await screen.findByRole('heading', { name: 'Comprometidas' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Colchonetas y cobijas'),
    ).toBeInTheDocument()

    await user.click(
      await screen.findByRole('button', { name: 'Cancelar compromiso' }),
    )

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith('o2'))
  })

  it('no muestra el botón de cancelar para compromisos de otros', async () => {
    mockedMe.mockResolvedValue(loggedInMe)
    mockedOffers.mockImplementation((filters) =>
      Promise.resolve(
        filters?.forTransport === 'assigned'
          ? {
              offers: [
                { ...assignedOffer, id: 'o3', claim: { ...assignedOffer.claim!, mine: false } },
              ],
              total: 1,
              limit: 50,
              offset: 0,
            }
          : hubResponse,
      ),
    )
    renderHub()

    expect(
      await screen.findByText('Colchonetas y cobijas'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Cancelar compromiso' }),
    ).not.toBeInTheDocument()
  })

  it('pide iniciar sesión cuando no hay usuario', async () => {
    mockedMe.mockResolvedValue({ authenticated: false, name: null, email: null, staff: null })
    renderHub()

    expect(
      await screen.findByRole('link', { name: 'Inicia sesión para llevarla' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Me comprometo a llevarla' }),
    ).not.toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay cargas', async () => {
    mockedMe.mockResolvedValue({ authenticated: false, name: null, email: null, staff: null })
    mockedOffers.mockResolvedValue({ offers: [], total: 0, limit: 50, offset: 0 })
    renderHub()

    expect(
      await screen.findByText('No hay suministros esperando transporte'),
    ).toBeInTheDocument()
  })
})