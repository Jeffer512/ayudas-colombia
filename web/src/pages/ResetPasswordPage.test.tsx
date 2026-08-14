import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import ResetPasswordPage from './ResetPasswordPage'

vi.mock('../api/client', () => ({
  api: {
    resetPassword: vi.fn(),
  },
}))

const mockedResetPassword = vi.mocked(api.resetPassword)

function renderPage(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <ResetPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockedResetPassword.mockReset()
  })

  it('restablece la contraseña con el token del enlace', async () => {
    mockedResetPassword.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    renderPage('/restablecer-contrasena?token=abcdef')

    await user.type(
      screen.getByLabelText('Contraseña nueva'),
      'nueva-contrasena',
    )
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'nueva-contrasena')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    await waitFor(() =>
      expect(mockedResetPassword).toHaveBeenCalledWith(
        'abcdef',
        'nueva-contrasena',
      ),
    )
    expect(
      await screen.findByRole('heading', { name: 'Contraseña actualizada' }),
    ).toBeInTheDocument()
  })

  it('avisa cuando las contraseñas no coinciden y no envía', async () => {
    const user = userEvent.setup()
    renderPage('/restablecer-contrasena?token=abcdef')

    await user.type(screen.getByLabelText('Contraseña nueva'), 'una-contrasena')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'otra-contrasena')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Las contraseñas no coinciden',
    )
    const submit = screen.getByRole('button', { name: 'Guardar contraseña' })
    expect(submit).toBeDisabled()

    await user.click(submit)
    expect(mockedResetPassword).not.toHaveBeenCalled()
  })

  it('sin token sugiere solicitar un enlace nuevo', async () => {
    renderPage('/restablecer-contrasena')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falta el enlace de restablecimiento',
    )
    expect(
      screen.queryByRole('button', { name: 'Guardar contraseña' }),
    ).not.toBeInTheDocument()
  })
})