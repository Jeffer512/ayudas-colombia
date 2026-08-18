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
    me: vi.fn(),
    helpOrgs: vi.fn(),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

const mockedCities = vi.mocked(api.cities)
const mockedCreate = vi.mocked(api.createOffer)
const mockedMe = vi.mocked(api.me)
const mockedOrg = vi.mocked(api.helpOrgs)

function renderPage(route?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route ?? '/ofrecer-ayuda']}>
        <CreateOfferPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreateOfferPage', () => {
  beforeEach(() => {
    mockedCities.mockReset()
    mockedCreate.mockReset()
    mockedMe.mockReset()
    mockedOrg.mockReset()
    mockedMe.mockResolvedValue({
      authenticated: false,
      name: null,
      email: null,
      staff: null,
      pendingOrgId: null,
    })
    mockedOrg.mockResolvedValue({
      helpOrgs: [
        {
          id: 'org-acopio-1',
          type: 'ciudadano',
          category: 'acopio',
          name: 'Comedor Esperanza',
          description: null,
          address: 'Calle 7 #3-20',
          lat: 4.81,
          lng: -75.7,
          city: { code: 'pereira', name: 'Pereira' },
          contactName: null,
          contactPhone: null,
          hours: null,
          accepts: null,
          status: 'open',
          managed: false,
          createdAt: '2026-08-01T12:00:00Z',
          updatedAt: '2026-08-01T12:00:00Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    })
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

  it('preselecciona transporte cuando llega del centro de carga y publica la oferta', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-5',
      resolveCode: '5555',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage('/ofrecer-ayuda?tipo=transport_offered')

    const typeSelect = await screen.findByLabelText('Tipo')
    expect(typeSelect).toHaveValue('transport_offered')
    const options = Array.from(
      typeSelect.querySelectorAll('option'),
    ).map((option) => option.textContent ?? '')
    expect(options).toContain('Ofrezco transporte')
    expect(
      screen.getByText(/aparecen en el centro de carga/),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Transporte')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Título'), 'Ofrezco transporte en Pereira')
    await user.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Camioneta disponible para llevar suministros durante la semana.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Carlos Delgado')
    await user.type(screen.getByLabelText('Teléfono'), '3105558888')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transport_offered',
          title: 'Ofrezco transporte en Pereira',
        }),
      ),
    )
    const body = mockedCreate.mock.calls[0][0] as Record<string, unknown>
    expect(body).not.toHaveProperty('transport')
    expect(body).not.toHaveProperty('audience')
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
      screen.getByLabelText('Descripción (opcional)'),
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

  it('con sesión, recuerda que la oferta también se cierra desde la cuenta', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: 'Laura',
      email: 'laura@correo.com',
      staff: null,
      pendingOrgId: null,
    })
    mockedCreate.mockResolvedValue({
      id: 'new-auth',
      resolveCode: '7777',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      await screen.findByLabelText('Tipo'),
      'supplies_offered',
    )
    await user.type(screen.getByLabelText('Título'), 'Ofrezco kits de aseo')
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '3105552222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    expect(
      await screen.findByRole('heading', { name: 'Oferta publicada' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/ciérrala desde tu cuenta/)).toBeInTheDocument()
    expect(screen.queryByText(/única manera de cerrar/)).not.toBeInTheDocument()
    expect(screen.getByText('7777')).toBeInTheDocument()
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
      screen.getByLabelText('Descripción (opcional)'),
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
      screen.getByLabelText('Descripción (opcional)'),
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

  async function pickTag(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string | { custom: string },
) {
  if (typeof option === 'string') {
    await user.selectOptions(screen.getByLabelText(label), option)
  } else {
    await user.selectOptions(
      screen.getByLabelText(label),
      screen.getByRole('option', { name: 'Otro…' }),
    )
    await user.type(
      screen.getByLabelText(`${label}: otra opción`),
      option.custom,
    )
    await user.keyboard('{Enter}')
  }
}

async function addAnother(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Añadir otro/a' }))
}

it('envía ítems elegidos en el selector y la zona cuando puede transportar', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-6',
      resolveCode: '6666',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_offered')
    await user.selectOptions(await screen.findByLabelText('Transporte'), 'can_transport')
    await pickTag(user, 'Qué ofreces (opcional)', 'Agua potable')
    await addAnother(user)
    await pickTag(user, 'Qué ofreces (opcional)', { custom: 'Galletas' })
    await user.type(
      screen.getByLabelText('Zona de entrega (opcional)'),
      'Barrio San Nicolás',
    )
    await user.type(screen.getByLabelText('Título'), 'Ofrezco suministros')
    await user.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Pongo a disposición agua y alimentos para las familias afectadas.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '3105552222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          items: ['Agua potable', 'Galletas'],
          zone: 'Barrio San Nicolás',
        }),
      ),
    )
  })

  it('cambiar el selector sobrescribe el último ítem elegido', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-10',
      resolveCode: '1010',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_offered')
    await pickTag(user, 'Qué ofreces (opcional)', 'Agua potable')
    await user.selectOptions(
      screen.getByLabelText('Qué ofreces (opcional)'),
      'Limpieza',
    )
    await user.type(screen.getByLabelText('Título'), 'Ofrezco suministros')
    await user.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Pongo a disposición agua y alimentos para las familias afectadas.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '3105552222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          items: ['Limpieza'],
        }),
      ),
    )
  })

  it('agrega el ítem apenas se elige y ofrece añadir otro sin botón extra', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_offered')
    expect(
      screen.queryByRole('button', { name: 'Añadir otro/a' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Añadir Qué ofreces (opcional)' }),
    ).not.toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText('Qué ofreces (opcional)'),
      'Agua potable',
    )

    expect(
      screen.getByRole('button', { name: 'Quitar Agua potable' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Añadir otro/a' }),
    ).toBeInTheDocument()
  })

  it('después de agregar un ítem con "otro" el selector se vacía y la siguiente elección agrega', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-11',
      resolveCode: '1111',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_offered')
    await user.selectOptions(
      screen.getByLabelText('Qué ofreces (opcional)'),
      'Agua potable',
    )
    await addAnother(user)
    await pickTag(user, 'Qué ofreces (opcional)', { custom: 'Galletas' })
    expect(
      screen.getByLabelText('Qué ofreces (opcional)'),
    ).toHaveValue('')

    await user.selectOptions(
      screen.getByLabelText('Qué ofreces (opcional)'),
      'Limpieza',
    )
    await user.type(screen.getByLabelText('Título'), 'Ofrezco suministros')
    await user.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Pongo a disposición agua y alimentos para las familias afectadas.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '3105552222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          items: ['Agua potable', 'Galletas', 'Limpieza'],
        }),
      ),
    )
  })

  it('envía capacidades, disponibilidad y zona en ofertas de voluntariado', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-7',
      resolveCode: '7777',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'volunteers_offered')
    await pickTag(user, 'En qué puedes ayudar (opcional)', 'Cocina')
    await addAnother(user)
    await pickTag(user, 'En qué puedes ayudar (opcional)', {
      custom: 'Primeros auxilios',
    })
    await user.type(
      screen.getByLabelText('Horario / disponibilidad (opcional)'),
      'Fines de semana',
    )
    await user.type(
      screen.getByLabelText('Zona donde puedes ayudar (opcional)'),
      'Dosquebradas',
    )
    await user.type(screen.getByLabelText('Título'), 'Me ofrezco como voluntario')
    await user.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Ayudo a preparar alimentos en la sede de la cruz roja.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '3105552222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          volunteer: {
            capabilities: ['Cocina', 'Primeros auxilios'],
            availability: 'Fines de semana',
          },
          zone: 'Dosquebradas',
        }),
      ),
    )
  })

  it('envía los datos del vehículo elegidos en el selector', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-8',
      resolveCode: '8888',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage('/ofrecer-ayuda?tipo=transport_offered')

    await pickTag(user, 'Tipo de vehículo (opcional)', 'Camioneta')
    await user.type(
      screen.getByLabelText('Capacidad (opcional)'),
      '2 toneladas',
    )
    await user.type(screen.getByLabelText('Título'), 'Ofrezco transporte en Pereira')
    await user.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Camioneta disponible para llevar suministros durante la semana.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Carlos Delgado')
    await user.type(screen.getByLabelText('Teléfono'), '3105558888')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicle: {
            vehicleType: 'Camioneta',
            capacity: '2 toneladas',
          },
        }),
      ),
    )
  })

  it('guarda el texto de "otro" directamente como tipo de vehículo', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-9',
      resolveCode: '9999',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage('/ofrecer-ayuda?tipo=transport_offered')

    await pickTag(user, 'Tipo de vehículo (opcional)', { custom: 'Camión cisterna' })
    await user.type(screen.getByLabelText('Título'), 'Ofrezco transporte en Pereira')
    await user.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Camión cisterna disponible para llevar agua durante la semana.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Carlos Delgado')
    await user.type(screen.getByLabelText('Teléfono'), '3105558888')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicle: { vehicleType: 'Camión cisterna' },
        }),
      ),
    )
    const body = mockedCreate.mock.calls[0][0] as Record<string, unknown>
    expect(body.vehicle).not.toHaveProperty('capacity')
  })

  it('reemplaza el tipo de vehículo personalizado al elegir una opción', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-12',
      resolveCode: '1212',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage('/ofrecer-ayuda?tipo=transport_offered')

    await pickTag(user, 'Tipo de vehículo (opcional)', { custom: 'Camión cisterna' })
    await user.selectOptions(
      screen.getByLabelText('Tipo de vehículo (opcional)'),
      'Camioneta',
    )
    await user.type(screen.getByLabelText('Capacidad (opcional)'), '2 toneladas')
    await user.type(screen.getByLabelText('Título'), 'Ofrezco transporte en Pereira')
    await user.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Camioneta disponible para llevar suministros durante la semana.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Carlos Delgado')
    await user.type(screen.getByLabelText('Teléfono'), '3105558888')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicle: {
            vehicleType: 'Camioneta',
            capacity: '2 toneladas',
          },
        }),
      ),
    )
  })

  it('muestra zona solo para can_transport en suministros, nunca en refugio', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'shelter_offered')
    expect(screen.queryByLabelText(/Zona de entrega/)).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Tipo'), 'supplies_offered')
    expect(screen.queryByLabelText(/Zona de entrega/)).not.toBeInTheDocument()

    await user.selectOptions(await screen.findByLabelText('Transporte'), 'can_transport')
    expect(screen.getByLabelText('Zona de entrega (opcional)')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Transporte'), 'needs_transport')
    expect(screen.queryByLabelText(/Zona de entrega/)).not.toBeInTheDocument()
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
      screen.getByLabelText('Descripción (opcional)'),
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

  it('rechaza un teléfono inválido al publicar', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_offered')
    await user.type(screen.getByLabelText('Título'), 'Ofrezco suministros')
    await user.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Pongo a disposición kits de aseo para las familias afectadas.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), 'no-me-sabe')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Teléfono inválido',
    )
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('acepta un teléfono con separadores y prefijo', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-6',
      resolveCode: '4444',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Tipo'), 'supplies_offered')
    await user.type(screen.getByLabelText('Título'), 'Ofrezco suministros')
    await user.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Pongo a disposición kits de aseo para las familias afectadas.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '+57 (310) 555-2222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          reporter: expect.objectContaining({ phone: '+57 (310) 555-2222' }),
        }),
      ),
    )
  })

  it('envía el destino cuando el suministro requiere transporte', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-7',
      resolveCode: '3333',
    } as unknown as CreatedOffer)
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      await screen.findByLabelText('Tipo'),
      'supplies_offered',
    )
    await user.selectOptions(
      await screen.findByLabelText('Transporte'),
      'needs_transport',
    )
    await user.selectOptions(
      await screen.findByLabelText('¿Hacia dónde llevarlas?'),
      'org-acopio-1',
    )
    await user.type(screen.getByLabelText('Título'), 'Ofrezco suministros')
    await user.type(screen.getByLabelText('Tu nombre'), 'Laura Cifuentes')
    await user.type(screen.getByLabelText('Teléfono'), '3105552222')

    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'supplies_offered',
          transport: 'needs_transport',
          destinationOrgId: 'org-acopio-1',
        }),
      ),
    )
  })
})