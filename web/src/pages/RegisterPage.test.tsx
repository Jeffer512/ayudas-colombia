import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import RegisterPage from './RegisterPage'

vi.mock('../api/client', () => ({
  api: {
    register: vi.fn(),
  },
}))

const mockedRegister = vi.mocked(api.register)

function renderPage(initialEntries: string[] = ['/registro']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/registro" element={<RegisterPage />} />
        </Routes>
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
}

beforeEach(() => {
  mockedRegister.mockReset()
})

describe('RegisterPage', () => {
  it('registra una cuenta personal y muestra "Revisa tu correo"', async () => {
    mockedRegister.mockResolvedValue({})

    renderPage()
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
    })
  })

  it('no ofrece elegir una organización al registrarse', () => {
    renderPage()

    expect(
      screen.queryByLabelText('¿A qué organización perteneces?'),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Personal de organización/)).toBeNull()
  })

  it('muestra el enlace de verificación de desarrollo cuando el servidor lo devuelve', async () => {
    mockedRegister.mockResolvedValue({
      verificationUrl: 'http://localhost:5173/verificar-correo?token=abc',
    })

    renderPage()
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
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Ya existe una cuenta con este correo')
  })

  it('el enlace de inicio de sesión conserva el returnTo', async () => {
    renderPage(['/registro?returnTo=/nuevo-centro'])

    expect(
      screen.getByRole('link', { name: 'Inicia sesión' }),
    ).toHaveAttribute('href', '/iniciar-sesion?returnTo=/nuevo-centro')

    mockedRegister.mockResolvedValue({})
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(
      await screen.findByRole('link', { name: 'Ir a iniciar sesión' }),
    ).toHaveAttribute('href', '/iniciar-sesion?returnTo=/nuevo-centro')
  })
})