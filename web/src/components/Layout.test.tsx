import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import Layout from './Layout'

vi.mock('../api/client', () => ({
  api: {
    me: vi.fn(),
    logout: vi.fn(),
  },
}))

const mockedMe = vi.mocked(api.me)
const mockedLogout = vi.mocked(api.logout)

function renderLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Layout', () => {
  beforeEach(() => {
    mockedMe.mockReset()
    mockedLogout.mockReset()
  })

  it('muestra los enlaces de inicio de sesión cuando no hay sesión', async () => {
    mockedMe.mockResolvedValue({
      authenticated: false,
      name: null,
      email: null,
      staff: null,
      emailVerified: false,
      pendingOrgId: null,
    })
    renderLayout()

    expect(
      await screen.findByRole('link', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrarse' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Salir' }),
    ).not.toBeInTheDocument()
  })

  it('muestra el nombre del usuario y el botón de salir cuando hay sesión', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: 'Camila',
      email: 'camila@correo.co',
      staff: null,
      emailVerified: true,
      pendingOrgId: null,
    })
    renderLayout()

    expect(await screen.findByText('Hola, Camila')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute(
      'href',
      '/cuenta',
    )
    expect(
      screen.queryByRole('link', { name: 'Iniciar sesión' }),
    ).not.toBeInTheDocument()
  })

  it('cierra la sesión y vuelve a mostrar los enlaces de acceso', async () => {
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: 'Camila',
      email: 'camila@correo.co',
      staff: null,
      emailVerified: true,
      pendingOrgId: null,
    })
    mockedLogout.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    renderLayout()

    await user.click(await screen.findByRole('button', { name: 'Salir' }))

    await waitFor(() => expect(mockedLogout).toHaveBeenCalled())
    expect(
      await screen.findByRole('link', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Salir' }),
    ).not.toBeInTheDocument()
  })
})