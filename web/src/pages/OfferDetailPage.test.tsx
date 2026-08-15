import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Offer } from '../lib/types'
import OfferDetailPage from './OfferDetailPage'

vi.mock('../api/client', () => ({
  api: {
    offer: vi.fn(),
    updateOfferStatus: vi.fn(),
    cancelClaim: vi.fn(),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

const mockedOffer = vi.mocked(api.offer)
const mockedUpdateStatus = vi.mocked(api.updateOfferStatus)
const mockedCancel = vi.mocked(api.cancelClaim)

const baseOffer: Offer = {
  id: 'o1',
  type: 'supplies_offered',
  transport: 'can_transport',
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
      <MemoryRouter initialEntries={['/oferta/o1']}>
        <Routes>
          <Route path="/oferta/:id" element={<OfferDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('OfferDetailPage', () => {
  beforeEach(() => {
    mockedOffer.mockReset()
    mockedUpdateStatus.mockReset()
    mockedCancel.mockReset()
  })

  it('muestra la información de la oferta sin urgencia ni historial', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Ofrezco 100 kits de aseo' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Carmen Vila')).toBeInTheDocument()
    expect(screen.getByText(/Puedo transportar/)).toBeInTheDocument()
    expect(screen.queryByText(/Urgencia/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Historial/)).not.toBeInTheDocument()
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })

  it('marca la oferta como entregada con el código', async () => {
    mockedUpdateStatus.mockResolvedValue({ ...baseOffer, status: 'fulfilled' })
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Marcarla como entregada' }),
    )
    await user.type(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
      '1234',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith('o1', {
        status: 'fulfilled',
        resolveCode: '1234',
        note: undefined,
      }),
    )
  })

  it('reabre una oferta no disponible pidiendo el código', async () => {
    mockedUpdateStatus.mockResolvedValue({ ...baseOffer, status: 'open' })
    const user = userEvent.setup()
    renderPage({ ...baseOffer, status: 'unavailable' })

    await user.click(
      await screen.findByRole('button', { name: 'Reabrir oferta' }),
    )
    await user.type(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
      '1234',
    )
    await user.click(
      screen.getByRole('button', { name: 'Confirmar reapertura' }),
    )

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith(
        'o1',
        expect.objectContaining({ status: 'open', resolveCode: '1234' }),
      ),
    )
  })

  it('muestra error cuando el código es incorrecto', async () => {
    mockedUpdateStatus.mockRejectedValue(
      new Error('Código de cierre incorrecto'),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Marcarla como entregada' }),
    )
    await user.type(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
      '0000',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Código de cierre incorrecto',
    )
  })

  it('muestra el compromiso cuando la oferta está en camino', async () => {
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
        /Voluntaria se comprometió a llevar esta oferta/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Confirmar entrega' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reabrir oferta' }),
    ).toBeInTheDocument()
  })

  it('confirma la entrega de una oferta en camino', async () => {
    mockedUpdateStatus.mockResolvedValue({ ...baseOffer, status: 'fulfilled' })
    const user = userEvent.setup()
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

    await user.click(
      await screen.findByRole('button', { name: 'Confirmar entrega' }),
    )
    await user.type(
      screen.getByLabelText('Código de cierre (4 dígitos)'),
      '1234',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith(
        'o1',
        expect.objectContaining({ status: 'fulfilled', resolveCode: '1234' }),
      ),
    )
  })

  it('el dueño marca como entregada sin pedir el código', async () => {
    mockedUpdateStatus.mockResolvedValue({
      ...baseOffer,
      isOwner: true,
      status: 'fulfilled',
    })
    const user = userEvent.setup()
    renderPage({ ...baseOffer, isOwner: true })

    await user.click(
      await screen.findByRole('button', { name: 'Marcarla como entregada' }),
    )

    expect(
      screen.queryByLabelText('Código de cierre (4 dígitos)'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith('o1', {
        status: 'fulfilled',
        note: undefined,
      }),
    )
    expect(mockedUpdateStatus.mock.calls[0][1]).not.toHaveProperty('resolveCode')
  })

  it('el dueño reabre la oferta sin pedir el código', async () => {
    mockedUpdateStatus.mockResolvedValue({
      ...baseOffer,
      isOwner: true,
      status: 'open',
    })
    const user = userEvent.setup()
    renderPage({ ...baseOffer, isOwner: true, status: 'unavailable' })

    await user.click(
      await screen.findByRole('button', { name: 'Reabrir oferta' }),
    )

    expect(
      screen.queryByLabelText('Código de cierre (4 dígitos)'),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Confirmar reapertura' }),
    )

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith('o1', {
        status: 'open',
        note: undefined,
      }),
    )
  })

  it('permite a quien se comprometió cancelar el compromiso', async () => {
    mockedCancel.mockResolvedValue({
      ...baseOffer,
      status: 'open',
      claim: null,
      canClaim: true,
    })
    const user = userEvent.setup()
    renderPage({
      ...baseOffer,
      status: 'in_transit',
      claim: {
        id: 'c1',
        status: 'committed',
        claimerName: 'Voluntaria',
        mine: true,
        note: null,
        claimedAt: '2026-08-14T12:00:00Z',
      },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Cancelar compromiso' }),
    )

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith('o1'))
  })

  it('no muestra el botón de cancelar para compromisos de otros', async () => {
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
      await screen.findByRole('button', { name: 'Confirmar entrega' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Cancelar compromiso' }),
    ).not.toBeInTheDocument()
  })
})