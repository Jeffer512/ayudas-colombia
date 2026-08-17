import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Offer } from '../lib/types'
import OfferEditPage from './OfferEditPage'

vi.mock('../api/client', () => ({
  api: {
    offer: vi.fn(),
    updateOffer: vi.fn(),
    cities: vi.fn(),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

const mockedOffer = vi.mocked(api.offer)
const mockedUpdate = vi.mocked(api.updateOffer)
const mockedCities = vi.mocked(api.cities)

const baseOffer: Offer = {
  id: 'o1',
  isOwner: true,
  type: 'supplies_offered',
  transport: 'can_transport',
  items: ['Kits de aseo'],
  zone: 'Centro',
  volunteer: null,
  vehicle: null,
  status: 'open',
  title: 'Ofrezco 100 kits de aseo',
  description: 'Entrego kits de aseo en cualquier punto de la ciudad.',
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
  contactVisibility: 'public',
  claim: null,
  canClaim: false,
  resolvedAt: null,
  createdAt: '2026-08-13T12:00:00Z',
  updatedAt: '2026-08-13T12:00:00Z',
}

function renderPage(offer: Offer = baseOffer) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  mockedOffer.mockResolvedValue(offer)
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/oferta/o1/editar']}>
        <Routes>
          <Route path="/oferta/:id/editar" element={<OfferEditPage />} />
          <Route path="/oferta/o1" element={<div>DETALLE_OFERTA</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('OfferEditPage', () => {
  beforeEach(() => {
    mockedOffer.mockReset()
    mockedUpdate.mockReset()
    mockedCities.mockReset()
    mockedCities.mockResolvedValue({
      cities: [
        { id: 1, code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8133, centerLng: -75.6961 },
      ],
    })
    mockedUpdate.mockResolvedValue(baseOffer)
  })

  it('edita una oferta abierta sin compromiso y navega al detalle', async () => {
    const user = userEvent.setup()
    renderPage()

    const titleInput = await screen.findByLabelText('Título')
    await user.clear(titleInput)
    await user.type(titleInput, 'Ofrezco 120 kits de aseo')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        'o1',
        expect.objectContaining({
          title: 'Ofrezco 120 kits de aseo',
          transport: 'can_transport',
          items: ['Kits de aseo'],
          zone: 'Centro',
        }),
      ),
    )
    expect(mockedUpdate.mock.calls[0][1]).not.toHaveProperty('resolveCode')

    expect(await screen.findByText('DETALLE_OFERTA')).toBeInTheDocument()
  })

  it('exige el código de cierre cuando el visitante no es el autor', async () => {
    const user = userEvent.setup()
    renderPage({ ...baseOffer, isOwner: false })

    const titleInput = await screen.findByLabelText('Título')
    await user.clear(titleInput)
    await user.type(titleInput, 'Ofrezco 120 kits de aseo')
    await user.type(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
      '1234',
    )

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        'o1',
        expect.objectContaining({ resolveCode: '1234' }),
      ),
    )
  })

  it('el dueño no tiene que escribir el código de cierre', async () => {
    renderPage({ ...baseOffer, isOwner: true })

    expect(
      await screen.findByRole('button', { name: 'Guardar cambios' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Código de cierre (4 dígitos)'),
    ).not.toBeInTheDocument()
  })

  it('bloquea la edición cuando hay un compromiso de entrega', async () => {
    renderPage({
      ...baseOffer,
      status: 'in_transit',
      claim: {
        id: 'c1',
        status: 'committed',
        claimerName: 'Voluntaria',
        mine: false,
        note: null,
        claimedAt: '2026-08-14T12:00:00Z',
      },
    })

    expect(
      await screen.findByText(
        'Esta oferta ya tiene un compromiso de entrega y no se puede editar.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios' }),
    ).not.toBeInTheDocument()
  })

  it('bloquea la edición de una oferta cerrada', async () => {
    renderPage({ ...baseOffer, status: 'fulfilled', resolvedAt: '2026-08-14T10:00:00Z' })

    expect(
      await screen.findByText(
        'Esta oferta ya no está abierta y no se puede editar.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios' }),
    ).not.toBeInTheDocument()
  })
})