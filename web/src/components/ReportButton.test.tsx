import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import ReportButton from './ReportButton'

vi.mock('../api/client', () => ({
  api: {
    me: vi.fn(),
    createReport: vi.fn(),
  },
}))

const mockedMe = vi.mocked(api.me)
const mockedCreateReport = vi.mocked(api.createReport)

function renderButton(authenticated: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  mockedMe.mockResolvedValue({
    authenticated,
    name: authenticated ? 'Usuario Prueba' : null,
    email: authenticated ? 'usuario@example.com' : null,
    staff: null,
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReportButton kind="request" targetId="req-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ReportButton', () => {
  beforeEach(() => {
    mockedMe.mockReset()
    mockedCreateReport.mockReset()
  })

  it('invita a iniciar sesión cuando el visitante no está autenticado', async () => {
    renderButton(false)

    expect(
      await screen.findByRole('link', { name: 'Inicia sesión' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reportar' })).not.toBeInTheDocument()
  })

  it('envía el reporte con el motivo elegido y muestra la confirmación', async () => {
    mockedCreateReport.mockResolvedValue({ ok: true })
    renderButton(true)

    await userEvent.click(await screen.findByRole('button', { name: 'Reportar' }))
    await userEvent.click(
      screen.getByRole('radio', { name: 'Contenido falso o engañoso' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    await waitFor(() =>
      expect(mockedCreateReport).toHaveBeenCalledWith({
        kind: 'request',
        targetId: 'req-1',
        reason: 'fake',
        note: undefined,
      }),
    )
    expect(
      await screen.findByText(/tu reporte fue enviado/),
    ).toBeInTheDocument()
  })

  it('muestra el error del servidor sin enviar dos veces', async () => {
    mockedCreateReport.mockRejectedValueOnce(new Error('Ya reportaste esta publicación'))
    renderButton(true)

    await userEvent.click(await screen.findByRole('button', { name: 'Reportar' }))
    await userEvent.click(
      screen.getByRole('radio', { name: 'Publicación repetida o publicidad' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(
      await screen.findByText(/Ya reportaste esta publicación/),
    ).toBeInTheDocument()
    expect(mockedCreateReport).toHaveBeenCalledTimes(1)
  })

  it('incluye el detalle opcional en el reporte', async () => {
    mockedCreateReport.mockResolvedValue({ ok: true })
    renderButton(true)

    await userEvent.click(await screen.findByRole('button', { name: 'Reportar' }))
    await userEvent.click(
      screen.getByRole('radio', { name: 'Otro motivo' }),
    )
    await userEvent.type(
      screen.getByLabelText('Detalle (opcional)'),
      'El teléfono no contesta',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    await waitFor(() =>
      expect(mockedCreateReport).toHaveBeenCalledWith({
        kind: 'request',
        targetId: 'req-1',
        reason: 'other',
        note: 'El teléfono no contesta',
      }),
    )
  })

  it('no envía sin seleccionar un motivo', async () => {
    renderButton(true)

    await userEvent.click(await screen.findByRole('button', { name: 'Reportar' }))
    expect(screen.getByRole('button', { name: 'Enviar reporte' })).toBeDisabled()
  })
})