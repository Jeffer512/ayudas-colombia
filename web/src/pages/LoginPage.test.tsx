import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../api/client'
import LoginPage from './LoginPage'

vi.mock('../api/client', () => {
  class ApiError extends Error {
    code?: string
    constructor(message: string, code?: string) {
      super(message)
      this.code = code
    }
  }
  return {
    ApiError,
    api: {
      login: vi.fn(),
      resendVerification: vi.fn(),
    },
  }
})

const mockedLogin = vi.mocked(api.login)
const mockedResend = vi.mocked(api.resendVerification)

function renderPage(initialEntries: string[] = ['/iniciar-sesion']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/iniciar-sesion" element={<LoginPage />} />
          <Route path="/nuevo-centro" element={<div>NUEVO CENTRO</div>} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('Correo'), 'camila@correo.org')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'contrasena-segura')
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

beforeEach(() => {
  mockedLogin.mockReset()
  mockedResend.mockReset()
  mockedLogin.mockResolvedValue({ staff: null })
  mockedResend.mockResolvedValue({ ok: true })
})

describe('LoginPage', () => {
  it('con returnTo, redirige ahí tras iniciar sesión', async () => {
    renderPage(['/iniciar-sesion?returnTo=/nuevo-centro'])

    await fillAndSubmit()

    expect(await screen.findByText('NUEVO CENTRO')).toBeInTheDocument()
    await waitFor(() => expect(mockedLogin).toHaveBeenCalledTimes(1))
  })

  it('sin returnTo y sin membresía, lleva al inicio', async () => {
    renderPage()

    await fillAndSubmit()

    expect(await screen.findByText('HOME')).toBeInTheDocument()
  })

  it('mantiene el returnTo en el enlace de registro', () => {
    renderPage(['/iniciar-sesion?returnTo=/nuevo-centro'])

    expect(
      screen.getByRole('link', { name: 'Regístrate' }),
    ).toHaveAttribute('href', '/registro?returnTo=/nuevo-centro')
  })

  it('informa el error de credenciales', async () => {
    mockedLogin.mockRejectedValue(
      new ApiError('Correo o contraseña incorrectos'),
    )

    renderPage()
    await fillAndSubmit()

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Correo o contraseña incorrectos')
  })
})