import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import RegisterPage from './RegisterPage'

vi.mock('../api/client', () => ({
  api: {
    helpOrgs: vi.fn(),
    register: vi.fn(),
  },
}))

const mockedHelpOrgs = vi.mocked(api.helpOrgs)
const mockedRegister = vi.mocked(api.register)

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillForm() {
  await userEvent.type(screen.getByLabelText('Nombre'), 'Gerente')
  await userEvent.type(screen.getByLabelText('Correo'), 'gerente@org.org')
  await userEvent.type(
    screen.getByLabelText('Contraseña (mínimo 8 caracteres)'),
    'contrasena-segura',
  )
  await userEvent.selectOptions(
    screen.getByLabelText('¿A qué organización perteneces?'),
    'o1',
  )
}

beforeEach(() => {
  mockedHelpOrgs.mockReset()
  mockedRegister.mockReset()
  mockedHelpOrgs.mockResolvedValue({
    helpOrgs: [
      {
        id: 'o1',
        type: 'ciudadano',
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    total: 1,
    limit: 50,
    offset: 0,
  })
})

describe('RegisterPage', () => {
  it('tras registrarse muestra "Revisa tu correo" en lugar de abrir sesión', async () => {
    mockedRegister.mockResolvedValue({})

    renderPage()
    await screen.findByText('Centro La Florida')
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(
      await screen.findByRole('heading', { name: 'Revisa tu correo' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Enviamos un enlace de verificación/),
    ).toBeInTheDocument()
    expect(mockedRegister).toHaveBeenCalledWith({
      name: 'Gerente',
      email: 'gerente@org.org',
      password: 'contrasena-segura',
      orgId: 'o1',
    })
  })

  it('muestra el enlace de verificación de desarrollo cuando el servidor lo devuelve', async () => {
    mockedRegister.mockResolvedValue({
      verificationUrl: 'http://localhost:5173/verificar-correo?token=abc',
    })

    renderPage()
    await screen.findByText('Centro La Florida')
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(/Enlace de desarrollo/)).toBeInTheDocument()
    expect(
      screen.getByText('http://localhost:5173/verificar-correo?token=abc'),
    ).toBeInTheDocument()
  })

  it('informa el error del servidor al registrarse', async () => {
    mockedRegister.mockRejectedValue(new Error('Ya existe una cuenta con este correo'))

    renderPage()
    await screen.findByText('Centro La Florida')
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Ya existe una cuenta con este correo')
  })

  it('avisa que la solicitud quedará pendiente si la organización ya tiene personal', () => {
    renderPage()

    expect(
      screen.getByText(/pendiente de aprobación/),
    ).toBeInTheDocument()
  })
})