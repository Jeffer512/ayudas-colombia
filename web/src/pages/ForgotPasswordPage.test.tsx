import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import ForgotPasswordPage from './ForgotPasswordPage'

vi.mock('../api/client', () => ({
  api: {
    forgotPassword: vi.fn(),
  },
}))

const mockedForgotPassword = vi.mocked(api.forgotPassword)

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockedForgotPassword.mockReset()
  })

  it('envía el correo y muestra el mensaje genérico', async () => {
    mockedForgotPassword.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    renderPage()

    await user.type(
      screen.getByLabelText('Correo'),
      'persona@correo.org',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    await waitFor(() =>
      expect(mockedForgotPassword).toHaveBeenCalledWith('persona@correo.org'),
    )
    expect(
      await screen.findByRole('heading', { name: 'Revisa tu correo' }),
    ).toBeInTheDocument()
  })

  it('muestra el error del servidor', async () => {
    mockedForgotPassword.mockRejectedValue(
      new Error('Demasiadas solicitudes, intenta más tarde'),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(
      screen.getByLabelText('Correo'),
      'persona@correo.org',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Demasiadas solicitudes, intenta más tarde',
    )
  })
})