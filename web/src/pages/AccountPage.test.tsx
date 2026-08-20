import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { MeResponse } from '../lib/types'
import AccountPage from './AccountPage'

vi.mock('../api/client', () => ({
  api: {
    me: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
  },
}))

const mockedMe = vi.mocked(api.me)
const mockedUpdateAccount = vi.mocked(api.updateAccount)
const mockedDeleteAccount = vi.mocked(api.deleteAccount)

const loggedIn: MeResponse = {
  authenticated: true,
  name: 'Gerente Prueba',
  email: 'gerente@correo.org',
  staff: null,
  emailVerified: true,
  pendingOrgId: null,
}

function DestinationProbe() {
  const location = useLocation()
  return <div data-testid="destination">{location.pathname + location.search}</div>
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cuenta']}>
        <Routes>
          <Route path="/cuenta" element={<AccountPage />} />
          <Route path="*" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedMe.mockReset()
  mockedUpdateAccount.mockReset()
  mockedDeleteAccount.mockReset()
})

describe('AccountPage', () => {
  it('redirige a iniciar sesión cuando no hay sesión', async () => {
    mockedMe.mockResolvedValue({
      authenticated: false,
      name: null,
      email: null,
      staff: null,
      emailVerified: false,
      pendingOrgId: null,
    })

    renderPage()

    await waitFor(() =>
      expect(screen.getByTestId('destination')).toHaveTextContent(
        '/iniciar-sesion?returnTo=/cuenta',
      ),
    )
  })

  it('muestra el nombre y el correo de la cuenta', async () => {
    mockedMe.mockResolvedValue(loggedIn)

    renderPage()

    expect(await screen.findByLabelText('Nombre')).toHaveValue('Gerente Prueba')
    expect(screen.getByLabelText('Correo')).toHaveValue('gerente@correo.org')
  })

  it('guarda los cambios de perfil y confirma con un mensaje', async () => {
    mockedMe.mockResolvedValue(loggedIn)
    mockedUpdateAccount.mockResolvedValue({
      name: 'Nuevo Nombre',
      email: 'gerente@correo.org',
      emailChanged: false,
      verificationUrl: null,
    })
    const user = userEvent.setup()
    renderPage()

    await screen.findByLabelText('Nombre')
    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Nuevo Nombre')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Cambios guardados')
    expect(mockedUpdateAccount).toHaveBeenCalledWith({
      name: 'Nuevo Nombre',
      email: 'gerente@correo.org',
    })
  })

  it('exige la contraseña actual al cambiar el correo', async () => {
    mockedMe.mockResolvedValue(loggedIn)
    const user = userEvent.setup()
    renderPage()

    await screen.findByLabelText('Nombre')
    await user.clear(screen.getByLabelText('Correo'))
    await user.type(screen.getByLabelText('Correo'), 'nuevo@correo.org')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByLabelText('Contraseña actual')).toBeInTheDocument()
    expect(mockedUpdateAccount).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escribe tu contraseña actual para cambiar el correo',
    )
  })

  it('cambia el correo y muestra el aviso de verificación con el enlace de desarrollo', async () => {
    mockedMe.mockResolvedValue(loggedIn)
    mockedUpdateAccount.mockResolvedValue({
      name: 'Gerente Prueba',
      email: 'nuevo@correo.org',
      emailChanged: true,
      verificationUrl: 'http://localhost:5173/verificar-correo?token=abc',
    })
    const user = userEvent.setup()
    renderPage()

    await screen.findByLabelText('Nombre')
    await user.clear(screen.getByLabelText('Correo'))
    await user.type(screen.getByLabelText('Correo'), 'nuevo@correo.org')
    await user.type(screen.getByLabelText('Contraseña actual'), 'contrasena-segura')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'enviamos un enlace de verificación',
    )
    expect(
      screen.getByText('http://localhost:5173/verificar-correo?token=abc'),
    ).toBeInTheDocument()
    expect(mockedUpdateAccount).toHaveBeenCalledWith({
      name: 'Gerente Prueba',
      email: 'nuevo@correo.org',
      password: 'contrasena-segura',
    })
  })

  it('muestra el error del servidor al guardar', async () => {
    mockedMe.mockResolvedValue(loggedIn)
    mockedUpdateAccount.mockRejectedValue(new Error('Contraseña incorrecta'))
    const user = userEvent.setup()
    renderPage()

    await screen.findByLabelText('Nombre')
    await user.clear(screen.getByLabelText('Correo'))
    await user.type(screen.getByLabelText('Correo'), 'nuevo@correo.org')
    await user.type(screen.getByLabelText('Contraseña actual'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Contraseña incorrecta',
    )
  })

  it('avisa cuando el correo de la cuenta no está verificado', async () => {
    mockedMe.mockResolvedValue({ ...loggedIn, emailVerified: false })

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'correo actual todavía no está verificado',
    )
  })

  it('elimina la cuenta después de confirmar con la contraseña', async () => {
    mockedMe.mockResolvedValue(loggedIn)
    mockedDeleteAccount.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    renderPage()

    await screen.findByLabelText('Nombre')
    await user.click(screen.getByRole('button', { name: 'Eliminar cuenta' }))

    expect(
      await screen.findByRole('heading', { name: '¿Eliminar tu cuenta?' }),
    ).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Contraseña actual'),
      'contrasena-segura',
    )
    await user.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }))

    await waitFor(() =>
      expect(screen.getByTestId('destination')).toHaveTextContent('/'),
    )
    expect(mockedDeleteAccount).toHaveBeenCalledWith('contrasena-segura')
    expect(
      screen.queryByRole('heading', { name: '¿Eliminar tu cuenta?' }),
    ).not.toBeInTheDocument()
  })

  it('muestra el error del servidor al eliminar', async () => {
    mockedMe.mockResolvedValue(loggedIn)
    mockedDeleteAccount.mockRejectedValue(new Error('Contraseña incorrecta'))
    const user = userEvent.setup()
    renderPage()

    await screen.findByLabelText('Nombre')
    await user.click(screen.getByRole('button', { name: 'Eliminar cuenta' }))
    await screen.findByRole('heading', { name: '¿Eliminar tu cuenta?' })

    await user.type(
      screen.getByLabelText('Contraseña actual'),
      'incorrecta',
    )
    await user.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Contraseña incorrecta',
    )
    expect(mockedDeleteAccount).toHaveBeenCalledWith('incorrecta')
    expect(
      screen.getByRole('heading', { name: '¿Eliminar tu cuenta?' }),
    ).toBeInTheDocument()
  })
})