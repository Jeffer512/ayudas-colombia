import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import NewOrgPage from './NewOrgPage'

vi.mock('../api/client', () => ({
  api: {
    cities: vi.fn(),
    me: vi.fn(),
    createHelpOrg: vi.fn(),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: ({
    center,
    marker,
    onPick,
  }: {
    center: { lat: number; lng: number }
    marker?: { lat: number; lng: number } | null
    onPick?: (lat: number, lng: number) => void
  }) => (
    <div data-testid="map" data-center={`${center.lat},${center.lng}`}>
      <button onClick={() => onPick?.(4.8133, -75.6961)}>PICK</button>
      <span data-testid="marcado">{marker ? 'MARCADO' : 'SIN MARCA'}</span>
    </div>
  ),
}))

const mockedCities = vi.mocked(api.cities)
const mockedMe = vi.mocked(api.me)
const mockedCreate = vi.mocked(api.createHelpOrg)

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/nuevo-centro']}>
        <Routes>
          <Route path="/nuevo-centro" element={<NewOrgPage />} />
          <Route path="/mi-organizacion" element={<div>MI ORG PAGE</div>} />
          <Route path="/organizacion/:id" element={<div>ORG DETAIL</div>} />
          <Route path="/iniciar-sesion" element={<div>LOGIN PAGE</div>} />
          <Route path="/registro" element={<div>REGISTER PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedCities.mockReset()
  mockedMe.mockReset()
  mockedCreate.mockReset()

  mockedCities.mockResolvedValue({
    cities: [
      { id: 1, code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8133, centerLng: -75.6961 },
      { id: 2, code: 'manizales', name: 'Manizales', department: 'Caldas', centerLat: 5.0689, centerLng: -75.5174 },
    ],
  })
  mockedMe.mockResolvedValue({
    authenticated: false,
    name: null,
    email: null,
    staff: null,
    pendingOrgId: null,
  })
  mockedCreate.mockResolvedValue({
    id: 'org-1',
    type: 'ciudadano',
    category: 'acopio',
    name: 'Centro La Florida',
    description: null,
    address: null,
    lat: 4.8133,
    lng: -75.6961,
    city: { code: 'pereira', name: 'Pereira' },
    contactName: null,
    contactPhone: null,
    hours: null,
    accepts: null,
    status: 'open',
    managed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
})

async function fillFormAndSubmit() {
  await userEvent.type(screen.getByLabelText('Nombre'), 'Centro La Florida')
  await userEvent.click(screen.getByRole('button', { name: 'PICK' }))
  await userEvent.click(
    screen.getByRole('button', { name: 'Publicar organización' }),
  )
}

describe('NewOrgPage', () => {
  it('pregunta si trabajas en la organización antes de mostrar el formulario', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: '¿Trabajas en esta organización?' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Publicar organización' }),
    ).not.toBeInTheDocument()
  })

  it('al responder que no, publica sin reclamar y lleva al detalle', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'No, solo la publico' }),
    )
    expect(
      screen.getByRole('button', { name: 'Publicar organización' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Persona de contacto (opcional)'),
    ).toBeInTheDocument()

    await fillFormAndSubmit()
    await screen.findByText('ORG DETAIL')

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Centro La Florida', claim: false }),
      ),
    )
  })

  it('sin sesión y respondiendo que sí, pide iniciar sesión y conserva el retorno', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Sí, trabajo aquí' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Necesitas una cuenta para gestionarla' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Iniciar sesión' }),
    ).toHaveAttribute('href', '/iniciar-sesion?returnTo=/nuevo-centro')
    expect(
      screen.getByRole('link', { name: 'Crear cuenta' }),
    ).toHaveAttribute('href', '/registro?returnTo=/nuevo-centro')
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('con sesión, reclamar el lugar y navegar a "Mi organización"', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: 'Camila',
      email: 'camila@correo.org',
      staff: null,
      pendingOrgId: null,
    })

    renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Sí, trabajo aquí' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Publicar organización' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Persona responsable (opcional)'),
    ).toBeInTheDocument()

    await fillFormAndSubmit()
    await screen.findByText('MI ORG PAGE')

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Centro La Florida', claim: true }),
      ),
    )
  })

  it('recentra el mapa y borra el punto al cambiar de ciudad', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'No, solo la publico' }),
    )

    expect(screen.getByTestId('map')).toHaveAttribute('data-center', '4.8133,-75.6961')

    await userEvent.click(screen.getByRole('button', { name: 'PICK' }))
    expect(screen.getByTestId('marcado')).toHaveTextContent('MARCADO')

    await userEvent.selectOptions(screen.getByLabelText('Ciudad'), 'manizales')

    expect(screen.getByTestId('map')).toHaveAttribute('data-center', '5.0689,-75.5174')
    expect(screen.getByTestId('marcado')).toHaveTextContent('SIN MARCA')
  })

  it('muestra el error del servidor al publicar', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: 'Camila',
      email: 'camila@correo.org',
      staff: null,
      pendingOrgId: null,
    })
    mockedCreate.mockRejectedValue(
      new Error('Ya estás vinculado a una organización'),
    )

    renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Sí, trabajo aquí' }),
    )
    await fillFormAndSubmit()

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Ya estás vinculado a una organización')
  })

  it('rechaza un teléfono de contacto inválido', async () => {
    renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: 'No, solo la publico' }),
    )
    await userEvent.type(screen.getByLabelText('Nombre'), 'Centro La Florida')
    await userEvent.click(screen.getByRole('button', { name: 'PICK' }))
    await userEvent.type(
      screen.getByLabelText('Teléfono de contacto'),
      'novecientos',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Publicar organización' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Teléfono de contacto inválido',
    )
    expect(mockedCreate).not.toHaveBeenCalled()
  })
})