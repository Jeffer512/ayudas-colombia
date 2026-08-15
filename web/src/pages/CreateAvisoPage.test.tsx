import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { CreatedAviso } from '../lib/types'
import CreateAvisoPage from './CreateAvisoPage'

vi.mock('../api/client', () => ({
  api: {
    cities: vi.fn(),
    createAviso: vi.fn(),
  },
}))

vi.mock('../components/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

const mockedCities = vi.mocked(api.cities)
const mockedCreate = vi.mocked(api.createAviso)

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateAvisoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreateAvisoPage', () => {
  beforeEach(() => {
    mockedCities.mockReset()
    mockedCreate.mockReset()
    mockedCities.mockResolvedValue({
      cities: [
        {
          id: 1,
          code: 'pereira',
          name: 'Pereira',
          department: 'Risaralda',
          centerLat: 4.8133,
          centerLng: -75.6961,
        },
      ],
    })
  })

  it('no pide tipo (el aviso es de información) y muestra urgencia media', async () => {
    renderPage()

    expect(screen.queryByLabelText('Tipo')).not.toBeInTheDocument()
    expect(
      await screen.findByLabelText('Urgencia'),
    ).toBeInTheDocument()
    expect(screen.getByText(/emergencia/i)).toBeInTheDocument()
  })

  it('publica un aviso y no muestra código de cierre', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-1',
      marks: 0,
    } as unknown as CreatedAviso)
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Título'), 'Punto de agua en el parque')
    await user.type(
      screen.getByLabelText('Descripción'),
      'El parque principal reparte agua desde las 7am, llevar recipientes.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Nataly Trujillo')
    await user.type(screen.getByLabelText('Teléfono'), '3105551011')

    await user.click(screen.getByRole('button', { name: 'Publicar aviso' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          urgency: 'medium',
          title: 'Punto de agua en el parque',
          reporter: expect.objectContaining({ name: 'Nataly Trujillo' }),
        }),
      ),
    )

    expect(
      await screen.findByRole('heading', { name: 'Aviso publicado' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Código de cierre')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver aviso' })).toBeInTheDocument()
  })

  it('publica un aviso sin pedir medio de contacto', async () => {
    mockedCreate.mockResolvedValue({
      id: 'new-2',
      marks: 0,
    } as unknown as CreatedAviso)
    const user = userEvent.setup()
    renderPage()

    expect(
      screen.queryByText(/al menos un medio de contacto/i),
    ).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Título'), 'Ruta alterna por el centro')
    await user.type(
      screen.getByLabelText('Descripción'),
      'La vía queda bloqueada entre las 10am y 3pm por trabajos.',
    )
    await user.type(screen.getByLabelText('Tu nombre'), 'Andrés Mora')

    await user.click(screen.getByRole('button', { name: 'Publicar aviso' }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          reporter: { name: 'Andrés Mora' },
        }),
      ),
    )

    expect(
      await screen.findByRole('heading', { name: 'Aviso publicado' }),
    ).toBeInTheDocument()
  })
})