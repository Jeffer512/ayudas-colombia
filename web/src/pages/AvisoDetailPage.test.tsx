import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Aviso } from '../lib/types'
import AvisoDetailPage from './AvisoDetailPage'

vi.mock('../api/client', () => ({
  api: {
    aviso: vi.fn(),
    markAviso: vi.fn(),
    markerId: vi.fn(() => 'device-1'),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

const mockedAviso = vi.mocked(api.aviso)
const mockedMark = vi.mocked(api.markAviso)

const baseAviso: Aviso = {
  id: 'a1',
  type: 'info',
  urgency: 'medium',
  status: 'open',
  title: 'Punto de agua funcionando',
  description: 'El parque principal reparte agua desde las 7am.',
  address: 'Parque principal',
  lat: 4.8135,
  lng: -75.6965,
  city: { code: 'pereira', name: 'Pereira' },
  reporter: {
    name: 'Nataly Trujillo',
    phone: '3105551011',
    whatsapp: null,
    email: null,
  },
  marks: 1,
  createdAt: '2026-08-13T12:00:00Z',
  updatedAt: '2026-08-13T12:00:00Z',
}

function renderPage(aviso: Aviso = baseAviso) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  mockedAviso.mockResolvedValue(aviso)
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/aviso/a1']}>
        <Routes>
          <Route path="/aviso/:id" element={<AvisoDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AvisoDetailPage', () => {
  beforeEach(() => {
    mockedAviso.mockReset()
    mockedMark.mockReset()
  })

  it('muestra el aviso con su conteo de marcas', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Punto de agua funcionando' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Nataly Trujillo')).toBeInTheDocument()
    expect(screen.getByText('1 de 3 marcas')).toBeInTheDocument()
    expect(screen.queryByLabelText('Código de cierre')).not.toBeInTheDocument()
  })

  it('marca un aviso vigente como desactualizado', async () => {
    mockedMark.mockResolvedValue({ ...baseAviso, marks: 2 })
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Marcarlo como desactualizado' }),
    )

    await waitFor(() =>
      expect(mockedMark).toHaveBeenCalledWith('a1', { markerId: 'device-1' }),
    )
  })

  it('permite reabrir un aviso cerrado con "Aún vigente"', async () => {
    mockedMark.mockResolvedValue({ ...baseAviso, status: 'open', marks: 0 })
    const user = userEvent.setup()
    renderPage({ ...baseAviso, status: 'closed', marks: 3 })

    await user.click(await screen.findByRole('button', { name: 'Aún vigente' }))

    await waitFor(() =>
      expect(mockedMark).toHaveBeenCalledWith('a1', { markerId: 'device-1' }),
    )
  })
})