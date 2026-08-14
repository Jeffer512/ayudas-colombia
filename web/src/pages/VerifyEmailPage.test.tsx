import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import VerifyEmailPage from './VerifyEmailPage'

vi.mock('../api/client', () => ({
  api: {
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
  },
}))

const mockedVerifyEmail = vi.mocked(api.verifyEmail)
const mockedResend = vi.mocked(api.resendVerification)

function renderPage(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <VerifyEmailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedVerifyEmail.mockReset()
  mockedResend.mockReset()
})

describe('VerifyEmailPage', () => {
  it('verifica el correo con el token del enlace y muestra el éxito', async () => {
    mockedVerifyEmail.mockResolvedValue({ ok: true })

    renderPage('/verificar-correo?token=valid-token')

    await waitFor(() =>
      expect(mockedVerifyEmail).toHaveBeenCalledWith('valid-token'),
    )
    expect(
      await screen.findByRole('heading', { name: 'Correo verificado' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
  })

  it('con un token inválido ofrece reenviar el enlace', async () => {
    mockedVerifyEmail.mockRejectedValue(new Error('Enlace inválido'))
    mockedResend.mockResolvedValue({ ok: true })

    renderPage('/verificar-correo?token=expirado')

    expect(
      await screen.findByText(/El enlace no es válido o ya expiró/),
    ).toBeInTheDocument()

    await userEvent.type(
      screen.getByLabelText('Correo'),
      'gerente@org.org',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Reenviar enlace' }),
    )

    await waitFor(() =>
      expect(mockedResend).toHaveBeenCalledWith('gerente@org.org'),
    )
    expect(
      await screen.findByText(/Correo reenviado/),
    ).toBeInTheDocument()
  })

  it('sin token muestra directamente el formulario de reenvío', () => {
    renderPage('/verificar-correo')

    expect(
      screen.getByRole('button', { name: 'Reenviar enlace' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('informa el error de reenvío', async () => {
    mockedResend.mockRejectedValue(new Error('Demasiadas solicitudes'))

    renderPage('/verificar-correo')
    await userEvent.type(
      screen.getByLabelText('Correo'),
      'gerente@org.org',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Reenviar enlace' }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Demasiadas solicitudes')
  })
})