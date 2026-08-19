import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AnalyticsResponse } from '../lib/types'
import AdminPage from './AdminPage'

vi.mock('../api/client', () => ({
  api: {
    adminAnalytics: vi.fn(),
  },
}))

const mockedAdminAnalytics = vi.mocked(api.adminAnalytics)

const analytics: AnalyticsResponse = {
  daily: [
    { date: '2026-08-17', visitors: 1 },
    { date: '2026-08-18', visitors: 2 },
  ],
  today: 2,
  last7: 3,
  last30: 3,
}

function renderAdminPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminPage />
    </QueryClientProvider>,
  )
}

describe('AdminPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mockedAdminAnalytics.mockReset()
  })

  it('solicita el token antes de mostrar las estadísticas', () => {
    renderAdminPage()

    expect(
      screen.getByRole('heading', { name: 'Panel de estadísticas' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Token de administración')).toBeInTheDocument()
    expect(mockedAdminAnalytics).not.toHaveBeenCalled()
  })

  it('carga y muestra las estadísticas al ingresar el token', async () => {
    mockedAdminAnalytics.mockResolvedValue(analytics)
    const user = userEvent.setup()

    renderAdminPage()

    await user.type(screen.getByLabelText('Token de administración'), 'secreto')
    await user.click(screen.getByRole('button', { name: 'Ver estadísticas' }))

    await waitFor(() =>
      expect(mockedAdminAnalytics).toHaveBeenCalledWith('secreto'),
    )
    expect(window.sessionStorage.getItem('ayudas_admin_token')).toBe('secreto')
    expect(
      await screen.findByRole('heading', { name: 'Visitantes únicos' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Hoy')).toBeInTheDocument()
    expect(screen.getByText('Últimos 7 días')).toBeInTheDocument()
    expect(screen.getByText('Últimos 30 días')).toBeInTheDocument()
    expect(screen.getAllByText('2')).toHaveLength(2)
    expect(screen.getAllByText('3')).toHaveLength(2)
    expect(screen.getByText('Por día')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').length).toBe(2)
  })

  it('muestra un error cuando el token no es válido', async () => {
    mockedAdminAnalytics.mockRejectedValue(new Error('Token inválido'))
    const user = userEvent.setup()

    renderAdminPage()

    await user.type(screen.getByLabelText('Token de administración'), 'malo')
    await user.click(screen.getByRole('button', { name: 'Ver estadísticas' }))

    expect(
      await screen.findByText('No pudimos cargar las estadísticas. Revisa el token e inténtalo de nuevo.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cambiar token' }))
    expect(
      screen.getByRole('heading', { name: 'Panel de estadísticas' }),
    ).toBeInTheDocument()
  })
})