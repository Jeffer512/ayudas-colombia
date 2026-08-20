import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { CityMessage, CityMessageListResponse } from '../lib/types'
import ChatPage from './ChatPage'

vi.mock('../api/client', () => ({
  api: {
    cities: vi.fn(),
    cityMessages: vi.fn(),
    createCityMessage: vi.fn(),
    me: vi.fn(),
    createReport: vi.fn(),
    markerId: vi.fn(() => 'm1'),
  },
}))

const mockedCities = vi.mocked(api.cities)
const mockedMessages = vi.mocked(api.cityMessages)
const mockedCreate = vi.mocked(api.createCityMessage)
const mockedMe = vi.mocked(api.me)
const mockedCreateReport = vi.mocked(api.createReport)

const cities = [
  { id: 1, code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8, centerLng: -75.7 },
  { id: 2, code: 'armenia', name: 'Armenia', department: 'Quindío', centerLat: 4.5, centerLng: -75.7 },
]

const message: CityMessage = {
  id: 'msg-1',
  city: { code: 'pereira', name: 'Pereira' },
  name: 'Lina',
  body: 'El punto de acopio del parque cierra a las 6pm',
  markerId: 'm-other',
  mine: false,
  createdAt: new Date().toISOString(),
}

const listResponse: CityMessageListResponse = {
  messages: [message],
  total: 1,
  limit: 50,
  offset: 0,
}

class FakeEventSource {
  static instances: FakeEventSource[] = []
  static closed: FakeEventSource[] = []

  private listeners = new Map<string, Set<(event: { data: string }) => void>>()
  url: string

  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
    FakeEventSource.closed = []
  }

  addEventListener(type: string, handler: (event: { data: string }) => void) {
    const set = this.listeners.get(type) ?? new Set()
    set.add(handler)
    this.listeners.set(type, set)
  }

  emit(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) }
    for (const handler of this.listeners.get(type) ?? []) handler(event)
  }

  close() {
    FakeEventSource.closed.push(this)
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/chat']}>
        <ChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  mockedCities.mockResolvedValue({ cities })
  mockedMessages.mockResolvedValue(listResponse)
  mockedMe.mockResolvedValue({
    authenticated: false,
    name: null,
    email: null,
    staff: null,
    emailVerified: false,
    pendingOrgId: null,
  })
  FakeEventSource.instances = []
  FakeEventSource.closed = []
  Object.defineProperty(globalThis, 'EventSource', {
    value: FakeEventSource,
    writable: true,
  })
})

describe('ChatPage', () => {
  it('muestra el chat con los mensajes de la ciudad por defecto', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: /chat de pereira/i })).toBeTruthy()
    await waitFor(() => {
      expect(mockedMessages).toHaveBeenCalledWith({
        city: 'pereira',
        limit: 50,
        offset: 0,
        markerId: 'm1',
      })
    })
    expect(await screen.findByText('El punto de acopio del parque cierra a las 6pm')).toBeTruthy()
    expect(screen.getByText('Lina')).toBeTruthy()
  })

  it('cambia de ciudad y consulta el chat de la nueva', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    mockedMessages.mockResolvedValue({ ...listResponse, messages: [] })
    await user.selectOptions(screen.getByLabelText('Ciudad'), 'armenia')

    await waitFor(() => {
      expect(mockedMessages).toHaveBeenCalledWith({
        city: 'armenia',
        limit: 50,
        offset: 0,
        markerId: 'm1',
      })
    })
    expect(await screen.findByText('Aún no hay mensajes en este chat. ¡Escribe el primero!')).toBeTruthy()
  })

  it('publica un mensaje anónimo en el chat', async () => {
    const user = userEvent.setup()
    mockedCreate.mockResolvedValue({
      ...message,
      id: 'msg-new',
      body: 'Se necesita agua en el barrio Centro',
      mine: true,
    })
    renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    await user.type(screen.getByLabelText('Tu nombre'), 'Ana')
    await user.type(
      screen.getByLabelText('Mensaje'),
      'Se necesita agua en el barrio Centro',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'pereira',
          name: 'Ana',
          body: 'Se necesita agua en el barrio Centro',
          markerId: 'm1',
        }),
        expect.anything(),
      )
    })
    expect(await screen.findByText('Se necesita agua en el barrio Centro')).toBeTruthy()
    expect(screen.getByText('· tú')).toBeTruthy()
  })

  it('no publica si el mensaje está vacío', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    const button = screen.getByRole('button', { name: 'Enviar' })
    expect(button).toBeDisabled()

    await user.type(screen.getByLabelText('Tu nombre'), 'Ana')
    expect(button).toBeDisabled()

    await user.type(screen.getByLabelText('Mensaje'), '   ')
    expect(button).toBeDisabled()
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('no duplica el mensaje propio cuando el SSE también lo devuelve', async () => {
    const user = userEvent.setup()
    const sent = { ...message, id: 'msg-sent', body: 'Mensaje del autor', mine: true }
    mockedCreate.mockResolvedValue(sent)
    renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    await user.type(screen.getByLabelText('Tu nombre'), 'Ana')
    await user.type(screen.getByLabelText('Mensaje'), 'Mensaje del autor')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Mensaje del autor')

    const source = FakeEventSource.instances.find((s) => s.url.includes('pereira'))
    expect(source).toBeTruthy()
    source!.emit('new', { message: sent })

    await waitFor(() => {
      expect(screen.getAllByText('Mensaje del autor')).toHaveLength(1)
    })
    expect(screen.getByText('· tú')).toBeTruthy()
  })

  it('añade en tiempo real los mensajes ajenos que llegan por SSE', async () => {
    const view = renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    const source = FakeEventSource.instances.find((s) => s.url.includes('pereira'))
    expect(source).toBeTruthy()

    const live = { message: { ...message, id: 'msg-live', name: 'Rosa', body: 'Se acabó el agua en la vereda San Julián' } }
    source!.emit('new', live)

    expect(await screen.findByText('Se acabó el agua en la vereda San Julián')).toBeTruthy()
    expect(screen.getByText('Rosa')).toBeTruthy()

    view.unmount()
    expect(FakeEventSource.closed.length).toBeGreaterThan(0)
  })

  it('marca como propios los mensajes del mismo dispositivo anónimo por markerId', async () => {
    mockedMessages.mockResolvedValue({
      messages: [
        {
          ...message,
          id: 'msg-mine',
          markerId: 'm1',
          mine: false,
          body: 'Mi mensaje desde otro navegador de este equipo',
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    })
    renderPage()

    await screen.findByText('Mi mensaje desde otro navegador de este equipo')
    expect(screen.getByText('· tú')).toBeTruthy()
  })

  it('recuerda el nombre anónimo entre visitas', async () => {
    const user = userEvent.setup()
    mockedCreate.mockResolvedValue({
      ...message,
      id: 'msg-nick',
      body: 'Hola a todos',
      mine: true,
    })
    renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    await user.type(screen.getByLabelText('Tu nombre'), 'Carlota')
    await user.type(screen.getByLabelText('Mensaje'), 'Hola a todos')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Hola a todos')

    expect(window.localStorage.getItem('ayudas_chat_name')).toBe('Carlota')
  })

  it('carga mensajes anteriores con el botón', async () => {
    const user = userEvent.setup()
    const older = { ...message, id: 'msg-old', name: 'Carlos', body: 'Mensaje viejo del día anterior' }
    mockedMessages.mockImplementation(async (filters) =>
      filters.offset === 0
        ? { messages: [message], total: 2, limit: 50, offset: 0 }
        : { messages: [older], total: 2, limit: 50, offset: 50 },
    )
    renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    await user.click(screen.getByRole('button', { name: 'Cargar anteriores' }))

    expect(await screen.findByText('Mensaje viejo del día anterior')).toBeTruthy()
    expect(screen.getByText('El punto de acopio del parque cierra a las 6pm')).toBeTruthy()
  })

  it('muestra el botón de opciones solo al pasar el cursor por el mensaje', async () => {
    renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    const dots = screen.getByRole('button', { name: 'Más opciones' })
    expect(dots).toHaveClass('opacity-0', 'group-hover:opacity-100')
  })

  it('abre y cierra el menú de opciones del mensaje', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    const dots = screen.getByRole('button', { name: 'Más opciones' })
    await user.click(dots)
    expect(await screen.findByRole('link', { name: 'Inicia sesión' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Más opciones' }))
    expect(screen.queryByRole('link', { name: 'Inicia sesión' })).not.toBeInTheDocument()
  })

  it('cierra el menú de opciones al pulsar fuera', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    await user.click(screen.getByRole('button', { name: 'Más opciones' }))
    expect(await screen.findByRole('link', { name: 'Inicia sesión' })).toBeInTheDocument()

    await user.click(screen.getByTestId('chat-menu-backdrop'))
    expect(screen.queryByRole('link', { name: 'Inicia sesión' })).not.toBeInTheDocument()
  })

  it('reporta un mensaje desde el menú de opciones', async () => {
    const user = userEvent.setup()
    mockedMe.mockResolvedValue({
      authenticated: true,
      name: 'Usuario Prueba',
      email: 'usuario@example.com',
      staff: null,
      emailVerified: true,
      pendingOrgId: null,
    })
    mockedCreateReport.mockResolvedValue({ ok: true })
    renderPage()

    await screen.findByText('El punto de acopio del parque cierra a las 6pm')

    await user.click(screen.getByRole('button', { name: 'Más opciones' }))
    await user.click(screen.getByRole('button', { name: 'Reportar' }))
    await user.click(screen.getByRole('radio', { name: 'Contenido falso o engañoso' }))
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    await waitFor(() =>
      expect(mockedCreateReport).toHaveBeenCalledWith({
        kind: 'message',
        targetId: 'msg-1',
        reason: 'fake',
        note: undefined,
      }),
    )
    expect(await screen.findByText(/tu reporte fue enviado/)).toBeInTheDocument()
  })
})