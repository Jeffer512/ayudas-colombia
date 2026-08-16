import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { CreatedRequest } from '../lib/types'
import CreateRequestPage from './CreateRequestPage'

vi.mock('../api/client', () => ({
  api: {
    cities: vi.fn(),
    createRequest: vi.fn(),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: ({
    onPick,
  }: {
    onPick?: (lat: number, lng: number) => void
  }) => (
    <div data-testid="map">
      <button onClick={() => onPick?.(4.8133, -75.6961)}>PICK</button>
    </div>
  ),
}))

const mockedCities = vi.mocked(api.cities)
const mockedCreate = vi.mocked(api.createRequest)

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateRequestPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreateRequestPage', () => {
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

  it('publica un pedido y muestra el código de cierre', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-1',
      resolveCode: '4821',
    } as unknown as CreatedRequest)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_request')
    await user.type(screen.getByLabelText('Título'), 'Necesitamos agua potable hoy')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Las familias del sector requieren agua para cocinar y beber.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'María Gómez')
    await user.type(screen.getByLabelText('Teléfono'), '3158765432')
    await user.type(screen.getByLabelText('Dirección o referencia'), 'Calle 12 #4-50')

    await user.click(screen.getByRole('button', { name: 'Publicar pedido' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'supplies_request',
          urgency: 'medium',
          title: 'Necesitamos agua potable hoy',
          cityCode: 'pereira',
          reporter: expect.objectContaining({
            name: 'María Gómez',
            phone: '3158765432',
          }),
        }),
      ),
    )

    expect(
      await screen.findByRole('heading', { name: 'Pedido publicado' }),
    ).toBeInTheDocument()
    expect(screen.getByText('4821')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver pedido' })).toBeInTheDocument()
  })

  it('muestra y envía transporte solo en solicitudes de suministros', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-2',
      resolveCode: '1234',
    } as unknown as CreatedRequest)
    const user = userEvent.setup()
    renderPage()

    expect(screen.queryByLabelText('Transporte')).not.toBeInTheDocument()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'shelter_request')
    expect(screen.queryByLabelText('Transporte')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Tipo'), 'supplies_request')
    await user.selectOptions(await screen.findByLabelText('Transporte'), 'needs_transport')
    await user.type(screen.getByLabelText('Título'), 'Necesitamos agua y transporte')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Necesitamos agua y que tenga forma de llegar hasta el barrio alto.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'María Gómez')
    await user.type(screen.getByLabelText('Teléfono'), '3158765432')

    await user.click(screen.getByRole('button', { name: 'Publicar pedido' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ transport: 'needs_transport' }),
      ),
    )
  })

it('envía los ítems pedidos solo en solicitudes de suministros', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-3',
      resolveCode: '3333',
    } as unknown as CreatedRequest)
    const user = userEvent.setup()
    renderPage()

    expect(screen.queryByLabelText('Qué necesitas (opcional)')).not.toBeInTheDocument()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'shelter_request')
    expect(screen.queryByLabelText('Qué necesitas (opcional)')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Tipo'), 'supplies_request')
    await user.type(
      await screen.findByLabelText('Qué necesitas (opcional)'),
      'Agua, comida; mantas',
    )
    await user.type(screen.getByLabelText('Título'), 'Necesitamos agua potable')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Las familias del sector requieren agua para cocinar y beber.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'María Gómez')
    await user.type(screen.getByLabelText('Teléfono'), '3158765432')

    await user.click(screen.getByRole('button', { name: 'Publicar pedido' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          items: ['Agua', 'comida', 'mantas'],
        }),
      ),
    )
  })

  it('muestra error del servidor si falla la publicación', async () => {
    mockedCreate.mockRejectedValue(new Error('Ciudad no encontrada: pereira'))
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_request')
    await user.type(screen.getByLabelText('Título'), 'Necesitamos agua potable hoy')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Las familias del sector requieren agua para cocinar y beber.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'María Gómez')
    await user.type(screen.getByLabelText('Teléfono'), '3158765432')

    await user.click(screen.getByRole('button', { name: 'Publicar pedido' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ciudad no encontrada: pereira',
    )
    expect(screen.queryByText('Pedido publicado')).not.toBeInTheDocument()
  })

  it('envía la visibilidad de contacto elegida al publicar', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-3',
      resolveCode: '9999',
    } as unknown as CreatedRequest)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_request')
    await user.type(screen.getByLabelText('Título'), 'Necesitamos agua potable hoy')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Las familias del sector requieren agua para cocinar y beber.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'María Gómez')
    await user.type(screen.getByLabelText('Teléfono'), '3158765432')
    await user.selectOptions(screen.getByLabelText('Contacto'), 'users')

    await user.click(screen.getByRole('button', { name: 'Publicar pedido' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ contactVisibility: 'users' }),
      ),
    )
  })

  it('envía WhatsApp o correo como medio de contacto alternativo', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-4',
      resolveCode: '1234',
    } as unknown as CreatedRequest)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_request')
    await user.type(screen.getByLabelText('Título'), 'Necesitamos agua potable hoy')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Las familias del sector requieren agua para cocinar y beber.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Ana Torres')
    await user.type(screen.getByLabelText('WhatsApp (número o usuario)'), '3115550000')
    await user.type(screen.getByLabelText('Correo'), 'ana@correo.com')

    await user.click(screen.getByRole('button', { name: 'Publicar pedido' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          reporter: expect.objectContaining({
            whatsapp: '3115550000',
            email: 'ana@correo.com',
          }),
        }),
      ),
    )
  })

  it('muestra el selector de foto solo para personas y mascotas desaparecidas', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.queryByLabelText('Foto (opcional)')).not.toBeInTheDocument()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_request')
    expect(screen.queryByLabelText('Foto (opcional)')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Tipo'), 'missing_person')
    expect(screen.getByLabelText('Foto (opcional)')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Tipo'), 'missing_pet')
    expect(screen.getByLabelText('Foto (opcional)')).toBeInTheDocument()
  })

  it('pide al menos un medio de contacto', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_request')
    await user.type(screen.getByLabelText('Título'), 'Necesitamos agua potable hoy')
    await user.type(
      screen.getByLabelText('Descripción'),
      'Las familias del sector requieren agua para cocinar y beber.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'María Gómez')

    await user.click(screen.getByRole('button', { name: 'Publicar pedido' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'medio de contacto',
    )
    expect(mockedCreate).not.toHaveBeenCalled()
  })
})