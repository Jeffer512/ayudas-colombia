import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { HelpOrg, HelpOrgItem, Staff } from '../lib/types'
import MyOrgPage from './MyOrgPage'

vi.mock('../api/client', () => ({
  api: {
    me: vi.fn(),
    helpOrg: vi.fn(),
    orgMembers: vi.fn(),
    requests: vi.fn(),
    cities: vi.fn(),
    createOrgRequest: vi.fn(),
    orgItems: vi.fn(),
    createOrgItem: vi.fn(),
    updateOrgItem: vi.fn(),
    deleteOrgItem: vi.fn(),
    approveOrgMember: vi.fn(),
    rejectOrgMember: vi.fn(),
    helpOrgs: vi.fn(),
    joinOrg: vi.fn(),
    updateHelpOrg: vi.fn(),
    updateHelpOrgStatus: vi.fn(),
    logout: vi.fn(),
  },
}))

const mockedMe = vi.mocked(api.me)
const mockedHelpOrg = vi.mocked(api.helpOrg)
const mockedOrgMembers = vi.mocked(api.orgMembers)
const mockedRequests = vi.mocked(api.requests)
const mockedCities = vi.mocked(api.cities)
const mockedOrgItems = vi.mocked(api.orgItems)
const mockedCreateOrgItem = vi.mocked(api.createOrgItem)
const mockedUpdateOrgItem = vi.mocked(api.updateOrgItem)
const mockedDeleteOrgItem = vi.mocked(api.deleteOrgItem)
const mockedApproveOrgMember = vi.mocked(api.approveOrgMember)
const mockedRejectOrgMember = vi.mocked(api.rejectOrgMember)
const mockedHelpOrgs = vi.mocked(api.helpOrgs)
const mockedJoinOrg = vi.mocked(api.joinOrg)
const mockedUpdateHelpOrg = vi.mocked(api.updateHelpOrg)
const mockedUpdateHelpOrgStatus = vi.mocked(api.updateHelpOrgStatus)

const staff: Staff = {
  id: 's1',
  userId: 'u1',
  email: 'manager@org.org',
  name: 'Manager',
  role: 'manager',
  orgId: 'o1',
  status: 'active',
}

const org: HelpOrg = {
  id: 'o1',
  type: 'oficial',
  category: 'acopio',
  name: 'Centro La Florida',
  description: null,
  address: null,
  lat: null,
  lng: null,
  city: { code: 'pereira', name: 'Pereira' },
  contactName: null,
  contactPhone: null,
  hours: null,
  accepts: null,
  status: 'open',
  managed: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function item(id: string, overrides: Partial<HelpOrgItem> = {}): HelpOrgItem {
  return {
    id,
    orgId: 'o1',
    kind: 'available',
    name: 'Agua',
    quantity: 100,
    unit: 'botellas',
    updatedBy: 'Manager',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyOrgPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedMe.mockReset()
  mockedHelpOrg.mockReset()
  mockedOrgMembers.mockReset()
  mockedRequests.mockReset()
  mockedCities.mockReset()
  mockedOrgItems.mockReset()
  mockedCreateOrgItem.mockReset()
  mockedUpdateOrgItem.mockReset()
  mockedDeleteOrgItem.mockReset()
  mockedApproveOrgMember.mockReset()
  mockedRejectOrgMember.mockReset()
  mockedHelpOrgs.mockReset()
  mockedJoinOrg.mockReset()

  mockedUpdateHelpOrg.mockReset()
  mockedUpdateHelpOrgStatus.mockReset()

  mockedMe.mockResolvedValue({
    authenticated: true,
    name: staff.name,
    email: staff.email,
    staff,
    emailVerified: true,
    pendingOrgId: null,
  })
  mockedHelpOrg.mockResolvedValue(org)
  mockedOrgMembers.mockResolvedValue({ members: [] })
  mockedHelpOrgs.mockResolvedValue({
    helpOrgs: [org],
    total: 1,
    limit: 50,
    offset: 0,
  })
  mockedRequests.mockResolvedValue({ requests: [], total: 0, limit: 50, offset: 0 })
  mockedCities.mockResolvedValue({
    cities: [
      { id: 1, code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8133, centerLng: -75.6961 },
    ],
  })
  mockedOrgItems.mockResolvedValue({
    items: [
      item('i1', { name: 'Agua' }),
      item('i2', { kind: 'needed', name: 'Colchonetas', quantity: 40, unit: 'unidades' }),
    ],
  })
  mockedCreateOrgItem.mockResolvedValue({ item: item('i3') })
  mockedUpdateOrgItem.mockResolvedValue({ item: item('i1') })
  mockedDeleteOrgItem.mockResolvedValue({ ok: true })
})

describe('MyOrgPage — datos de la organización', () => {
  it('el manager edita los datos de la organización', async () => {
    mockedUpdateHelpOrg.mockResolvedValue(org)
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar perfil' }),
    )

    const nameInput = await screen.findByLabelText('Nombre')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Centro La Florida Renovado')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mockedUpdateHelpOrg).toHaveBeenCalledWith('o1', {
        name: 'Centro La Florida Renovado',
        category: 'acopio',
        description: null,
        address: null,
        contactName: null,
        contactPhone: null,
        hours: null,
        accepts: null,
      }),
    )
  })

  it('rechaza guardar un teléfono de contacto inválido', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar perfil' }),
    )

    await userEvent.type(
      await screen.findByLabelText('Teléfono de contacto'),
      'horizontal',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Teléfono de contacto inválido',
    )
    expect(mockedUpdateHelpOrg).not.toHaveBeenCalled()
  })

  it('el manager ve la sección de datos de la organización', async () => {
    renderPage()

    expect(
      await screen.findByText('Datos de la organización'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Editar perfil' }),
    ).toBeInTheDocument()
  })

  it('un miembro no ve la sección de datos de la organización', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: staff.name,
      email: staff.email,
      staff: { ...staff, role: 'member' },
      emailVerified: true,
      pendingOrgId: null,
    })

    renderPage()
    await screen.findByText('Mi organización')

    expect(
      screen.queryByText('Datos de la organización'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Editar perfil' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('Publicar un pedido de la organización'),
    ).toBeInTheDocument()
  })
})

describe('MyOrgPage — estado de la organización', () => {
  it('permite al manager cerrar la organización', async () => {
    renderPage()

    expect(
      await screen.findByText('Estado de la organización'),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Cerrar organización' }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: /Confirmar cierre/ }),
    )

    await waitFor(() =>
      expect(mockedUpdateHelpOrgStatus).toHaveBeenCalledWith('o1', {
        status: 'closed',
      }),
    )
  })

  it('permite al manager reabrir la organización cerrada', async () => {
    mockedHelpOrg.mockResolvedValue({ ...org, status: 'closed' })
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reabrir organización' }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: /Confirmar apertura/ }),
    )

    await waitFor(() =>
      expect(mockedUpdateHelpOrgStatus).toHaveBeenCalledWith('o1', {
        status: 'open',
      }),
    )
  })

  it('no muestra el control de estado para un miembro', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: staff.name,
      email: staff.email,
      staff: { ...staff, role: 'member' },
      emailVerified: true,
      pendingOrgId: null,
    })
    renderPage()
    await screen.findByText('Mi organización')

    expect(
      screen.queryByText('Estado de la organización'),
    ).not.toBeInTheDocument()
  })
})

describe('MyOrgPage — inventario', () => {
  it('muestra los elementos del inventario de la organización', async () => {
    renderPage()

    expect(await screen.findByText('Agua')).toBeInTheDocument()
    expect(screen.getByText('Colchonetas')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('100 botellas')).toBeInTheDocument()
    expect(screen.getByText('40 unidades')).toBeInTheDocument()
  })

  it('agrega un elemento al inventario', async () => {
    renderPage()
    await screen.findByText('Agua')

    await userEvent.selectOptions(
      screen.getByLabelText('Tipo', { selector: '#itemKind' }),
      'needed',
    )
    await userEvent.type(screen.getByLabelText('Elemento'), 'Cobijas')
    await userEvent.type(screen.getByLabelText('Cantidad (opcional)'), '25')
    await userEvent.type(screen.getByLabelText('Unidad (opcional)'), 'unidades')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar elemento' }))

    await waitFor(() =>
      expect(mockedCreateOrgItem).toHaveBeenCalledWith('o1', {
        kind: 'needed',
        name: 'Cobijas',
        quantity: 25,
        unit: 'unidades',
      }),
    )
  })

  it('edita un elemento existente', async () => {
    renderPage()
    await screen.findByText('Agua')

    const editButtons = screen.getAllByRole('button', { name: 'Editar' })
    await userEvent.click(editButtons[0])

    const nameInput = await screen.findByLabelText('Nombre del elemento')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Agua embotellada')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(mockedUpdateOrgItem).toHaveBeenCalledWith('o1', 'i1', {
        kind: 'available',
        name: 'Agua embotellada',
        quantity: 100,
        unit: 'botellas',
      }),
    )
  })

  it('elimina un elemento del inventario', async () => {
    renderPage()
    await screen.findByText('Agua')

    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar' })
    await userEvent.click(deleteButtons[0])

    await waitFor(() => expect(mockedDeleteOrgItem).toHaveBeenCalledWith('o1', 'i1'))
  })
})

describe('MyOrgPage — solicitudes pendientes', () => {
  const pending: Staff = {
    id: 's2',
    userId: 'u2',
    email: 'colaborador@org.org',
    name: 'Colaborador',
    role: 'member',
    orgId: 'o1',
    status: 'pending',
  }

  beforeEach(() => {
    mockedOrgMembers.mockResolvedValue({ members: [pending, staff] })
    mockedApproveOrgMember.mockResolvedValue({ member: { ...pending, status: 'active' } })
    mockedRejectOrgMember.mockResolvedValue({ ok: true })
  })

  it('muestra la solicitud pendiente y la aprueba', async () => {
    renderPage()

    expect(
      await screen.findByText('Solicitudes pendientes de aprobación'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Colaborador')).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Aprobar' }),
    )

    await waitFor(() =>
      expect(mockedApproveOrgMember).toHaveBeenCalledWith('o1', 's2'),
    )
  })

  it('rechaza la solicitud pendiente', async () => {
    renderPage()
    await screen.findByText('Solicitudes pendientes de aprobación')
    await screen.findByText('Colaborador')

    await userEvent.click(
      screen.getByRole('button', { name: 'Rechazar' }),
    )

    await waitFor(() =>
      expect(mockedRejectOrgMember).toHaveBeenCalledWith('o1', 's2'),
    )
  })
})

describe('MyOrgPage — sin organización vinculada', () => {
  it('invita a iniciar sesión cuando no hay sesión', async () => {
    mockedMe.mockResolvedValue({
      authenticated: false,
      name: null,
      email: null,
      staff: null,
      emailVerified: false,
      pendingOrgId: null,
    })

    renderPage()

    expect(
      await screen.findByRole('link', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Publicar tu organización'),
    ).not.toBeInTheDocument()
  })

  it('ofrece publicar una organización o solicitar gestionar una existente', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: 'Ciudadana',
      email: 'ciudadana@correo.org',
      staff: null,
      emailVerified: true,
      pendingOrgId: null,
    })

    renderPage()

    expect(
      await screen.findByRole('link', { name: 'Publicar tu organización' }),
    ).toHaveAttribute('href', '/nuevo-centro')
    expect(
      screen.getByLabelText('¿Trabajas en una organización ya publicada?'),
    ).toBeInTheDocument()
  })

  it('envía la solicitud a la organización elegida', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: 'Ciudadana',
      email: 'ciudadana@correo.org',
      staff: null,
      emailVerified: true,
      pendingOrgId: null,
    })
    mockedJoinOrg.mockResolvedValue({
      membership: { id: 'm1', orgId: 'o1', role: 'member', status: 'pending' },
    })

    renderPage()
    await screen.findByRole('link', { name: 'Publicar tu organización' })
    await screen.findByRole('option', { name: 'Centro La Florida' })

    await userEvent.selectOptions(
      screen.getByLabelText('¿Trabajas en una organización ya publicada?'),
      'o1',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Solicitar gestionar esta organización' }),
    )

    await waitFor(() => expect(mockedJoinOrg).toHaveBeenCalledWith('o1'))
    expect(
      await screen.findByText(/pendiente de aprobación/),
    ).toBeInTheDocument()
  })

  it('muestra el estado pendiente cuando ya hay una solicitud sin aprobar', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: 'Ciudadana',
      email: 'ciudadana@correo.org',
      staff: null,
      emailVerified: true,
      pendingOrgId: 'o1',
    })

    renderPage()

    expect(
      await screen.findByText(/pendiente de aprobación/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ver la organización' }),
    ).toHaveAttribute('href', '/organizacion/o1')
  })
})
