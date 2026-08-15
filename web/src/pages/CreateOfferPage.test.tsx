import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { CreatedOffer } from '../lib/types'
import CreateOfferPage from './CreateOfferPage'

vi.mock('../api/client', () => ({
  api: {
    cities: vi.fn(),
    createOffer: vi.fn(),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

const mockedCities = vi.mocked(api.cities)
const mockedCreate = vi.mocked(api.createOffer)

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateOfferPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreateOfferPage', () => {
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

  it('solo muestra tipos de oferta y no pide urgencia', async () => {
    renderPage()

    const typeSelect = await screen.findByLabelText('Tipo')
    const options = Array.from(
      typeSelect.querySelectorAll('option'),
    ).map((option) => option.textContent ?? '')

    expect(options).toContain('Ofrezco suministros')
    expect(options).toContain('Me ofrezco como voluntario')
    expect(options).toContain('Refugio ofrecido')
    expect(options).not.toContain('Ofrezco transporte')
    expect(options).not.toContain('Solicitud de suministros')
    expect(screen.queryByLabelText('Urgencia')).not.toBeInTheDocument()
  })

  it('publica una oferta de voluntariado', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-1',
      resolveCode: '9371',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      await screen.findByLabelText('Tipo'),
      'volunteers_offered',
    )
    await user.type(screen.getByLabelText('Título'), 'Me ofrezco como voluntario')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Puedo ayudar a repartir comida y a evacuar durante el fin de semana.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '3105552222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'volunteers_offered',
          title: 'Me ofrezco como voluntario',
          reporter: expect.objectContaining({ name: 'Laura Cifuentes' }),
        }),
      ),
    )

    expect(
      await screen.findByRole('heading', { name: 'Oferta publicada' }),
    ).toBeInTheDocument()
    expect(screen.getByText('9371')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver oferta' })).toBeInTheDocument()
  })

  it('muestra transporte solo en ofertas de suministros', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-3',
      resolveCode: '1111',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'volunteers_offered')
    expect(screen.queryByLabelText('Transporte')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Tipo'), 'supplies_offered')
    await user.selectOptions(
      await screen.findByLabelText('Transporte'),
      'can_transport',
    )
    expect(screen.queryByText(/no hace falta dar tu dirección exacta/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Título'), 'Ofrezco kits de aseo')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Entrego kits de aseo en cualquier punto de la ciudad.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '3105552222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ transport: 'can_transport' }),
      ),
    )
  })

  it('avisa que las ofertas que necesitan transporte aparecen en el centro de carga', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_offered')
    await user.selectOptions(
      await screen.findByLabelText('Transporte'),
      'needs_transport',
    )

    expect(
      screen.getByText(/aparecen en el centro de carga/),
    ).toBeInTheDocument()
  })

  it('muestra la audiencia solo en ofertas de voluntariado y la envía al publicar', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-4',
      resolveCode: '2222',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_offered')
    expect(screen.queryByLabelText('Audiencia')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Tipo'), 'volunteers_offered')
    await user.selectOptions(await screen.findByLabelText('Audiencia'), 'orgs')

    await user.type(screen.getByLabelText('Título'), 'Me ofrezco como voluntario')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Puedo ayudar en traslados y cuidado de niños durante el fin de semana.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '3105552222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'volunteers_offered',
          audience: 'orgs',
          contactVisibility: 'public',
        }),
      ),
    )
  })

  it('permite restringir el contacto a usuarios registrados', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-5',
      resolveCode: '3333',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_offered')
    await user.selectOptions(screen.getByLabelText('Contacto'), 'users')
    await user.type(screen.getByLabelText('Título'), 'Ofrezco suministros')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Pongo a disposición kits de aseo para las familias afectadas.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '3105552222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ contactVisibility: 'users' }),
      ),
    )
  })
})