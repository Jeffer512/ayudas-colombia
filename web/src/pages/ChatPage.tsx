import { useEffect, useRef, useState } from 'react'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import ReportButton from '../components/ReportButton'
import { defaultCity } from '../lib/geo'
import { timeAgo } from '../lib/format'
import type { City, CityMessage, CityMessageListResponse } from '../lib/types'

const PAGE_SIZE = 50
const CHAT_NAME_KEY = 'ayudas_chat_name'

type MessagesPage = CityMessageListResponse

function readStoredChatName(): string {
  try {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(CHAT_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

function storeChatName(value: string) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CHAT_NAME_KEY, value)
  } catch {
    /* almacenamiento no disponible */
  }
}

function prependMessage(page: MessagesPage, message: CityMessage): MessagesPage {
  const alreadyPresent = page.messages.some((m) => m.id === message.id)
  return {
    ...page,
    total: page.total + (alreadyPresent ? 0 : 1),
    messages: [message, ...page.messages.filter((m) => m.id !== message.id)].slice(
      0,
      PAGE_SIZE,
    ),
  }
}

function MessageActions({ message, mine }: { message: CityMessage; mine: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Más opciones"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`absolute right-1 top-1 z-20 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 ${
          mine ? 'text-white/80 hover:bg-white/10' : 'text-fg-muted hover:bg-line'
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {open && (
        <>
          <div
            data-testid="chat-menu-backdrop"
            aria-hidden="true"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-8 z-20 w-80 rounded-lg border border-border bg-bg p-3 shadow-lg">
            <ReportButton kind="message" targetId={message.id} />
          </div>
        </>
      )}
    </>
  )
}

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const urlCity = searchParams.get('city') ?? ''

  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities: City[] = citiesQuery.data?.cities ?? []

  useEffect(() => {
    if (urlCity || cities.length === 0) return
    const fallback = defaultCity(cities)
    if (fallback) setSearchParams({ city: fallback.code })
  }, [cities, urlCity, setSearchParams])

  const cityCode = urlCity || defaultCity(cities)?.code || ''
  const selectedCity = cities.find((c) => c.code === cityCode)

  const me = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
  })

  const messagesQuery = useInfiniteQuery({
    queryKey: ['city-messages', cityCode],
    queryFn: ({ pageParam }) =>
      api.cityMessages({
        city: cityCode,
        limit: PAGE_SIZE,
        offset: pageParam,
        markerId: api.markerId(),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.offset + lastPage.messages.length < lastPage.total
        ? lastPage.offset + lastPage.messages.length
        : undefined,
    enabled: Boolean(cityCode),
  })

  const [name, setName] = useState<string>(() => readStoredChatName())
  const [body, setBody] = useState('')
  const nameTouched = useRef(false)

  useEffect(() => {
    if (!me.data?.authenticated || !me.data.name) return
    if (nameTouched.current) return
    setName(me.data.name)
  }, [me.data])

  const myMarkerId = api.markerId()

  const createMessage = useMutation({
    mutationFn: api.createCityMessage,
    onSuccess: (created) => {
      setBody('')
      if (!me.data?.authenticated) storeChatName(name.trim())
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ['city-messages', cityCode],
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page, i) =>
                  i === 0 ? prependMessage(page, created) : page,
                ),
              }
            : old,
      )
    },
  })

  useEffect(() => {
    if (!cityCode || typeof EventSource === 'undefined') return
    let hadOpened = false
    const source = new EventSource(
      `/api/city-messages/${encodeURIComponent(cityCode)}/events`,
    )
    source.addEventListener('new', (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        message: CityMessage
      }
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ['city-messages', cityCode],
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page, i) =>
                  i === 0 ? prependMessage(page, data.message) : page,
                ),
              }
            : old,
      )
    })
    source.addEventListener('open', () => {
      if (hadOpened) {
        void queryClient.invalidateQueries({ queryKey: ['city-messages', cityCode] })
      }
      hadOpened = true
    })
    return () => source.close()
  }, [cityCode, queryClient])

  const flatMessages = (messagesQuery.data?.pages ?? []).flatMap((p) => p.messages)
  const seen = new Set<string>()
  const uniqueMessages: CityMessage[] = []
  for (const message of flatMessages) {
    if (seen.has(message.id)) continue
    seen.add(message.id)
    uniqueMessages.push(message)
  }
  const orderedMessages = [...uniqueMessages].reverse()

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const stickToBottom = useRef(true)
  const anchorRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (anchorRef.current) {
      const prev = anchorRef.current
      el.scrollTop = el.scrollHeight - prev.scrollHeight + prev.scrollTop
      anchorRef.current = null
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [uniqueMessages.length])

  function loadOlder() {
    const el = scrollRef.current
    if (el) {
      anchorRef.current = { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight }
    }
    void messagesQuery.fetchNextPage()
  }

  const errorMessage = createMessage.isError
    ? (createMessage.error as Error).message
    : null

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Chat de {selectedCity?.name ?? 'tu ciudad'}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Conversación pública de la comunidad en tiempo real. Los mensajes se
          eliminan después de 7 días.
        </p>
      </div>

      <label className="mb-4 block">
        <span className="text-sm font-medium text-fg-muted">Ciudad</span>
        <select
          value={urlCity}
          onChange={(e) => setSearchParams({ city: e.target.value })}
          className="mt-1 block w-full max-w-xs rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg focus:border-primary"
        >
          <option value="" disabled>
            Elegir ciudad
          </option>
          {cities.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {messagesQuery.isPending && (
        <p className="py-8 text-center text-sm text-fg-muted" role="status">
          Cargando mensajes…
        </p>
      )}

      {messagesQuery.isError && (
        <div className="rounded-lg border border-danger-muted bg-danger-muted p-4 text-center text-sm text-danger">
          <p>No pudimos cargar el chat</p>
          <button
            onClick={() => void messagesQuery.refetch()}
            className="mt-2 rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger"
          >
            Reintentar
          </button>
        </div>
      )}

      {!messagesQuery.isPending && !messagesQuery.isError && (
        <div className="flex h-[65vh] flex-col overflow-hidden rounded-xl border border-border bg-surface">
          <div
            ref={scrollRef}
            onScroll={() => {
              const el = scrollRef.current
              if (!el) return
              const distance = el.scrollHeight - el.scrollTop - el.clientHeight
              stickToBottom.current = distance < 40
            }}
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {messagesQuery.hasNextPage && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={loadOlder}
                  className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg-muted hover:bg-surface"
                >
                  Cargar anteriores
                </button>
              </div>
            )}

            {orderedMessages.length === 0 ? (
              <p className="py-10 text-center text-sm text-fg-muted">
                Aún no hay mensajes en este chat. ¡Escribe el primero!
              </p>
            ) : (
              orderedMessages.map((message) => {
                const mine =
                  message.mine === true ||
                  (message.markerId != null && message.markerId === myMarkerId)
                return (
                  <div
                    key={message.id}
                    className={mine ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={`group relative max-w-[80%] rounded-2xl px-3 py-2 ${
                        mine
                          ? 'rounded-br-sm bg-primary text-white'
                          : 'rounded-bl-sm bg-bg border border-border text-fg'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2 pr-5">
                        <span className="text-xs font-semibold">
                          {message.name}
                          {mine && (
                            <span className="ml-1 font-normal opacity-80">· tú</span>
                          )}
                        </span>
                        <span className="text-[10px] text-fg-muted">
                          {timeAgo(message.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                      <MessageActions message={message} mine={mine} />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (body.trim() && name.trim() && cityCode) {
                createMessage.mutate({
                  city: cityCode,
                  name: name.trim(),
                  body: body.trim(),
                  markerId: api.markerId(),
                })
              }
            }}
            className="border-t border-border bg-surface p-3"
          >
            <div className="flex items-center gap-2">
              <input
                aria-label="Tu nombre"
                value={name}
                maxLength={120}
                onChange={(e) => {
                  nameTouched.current = true
                  setName(e.target.value)
                }}
                placeholder="Nombre"
                className="w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary"
              />
              <textarea
                aria-label="Mensaje"
                rows={1}
                maxLength={280}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe un mensaje…"
                className="flex-1 resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary"
              />
              <span className="text-xs text-fg-muted">{body.length}/280</span>
              <button
                type="submit"
                disabled={!body.trim() || !name.trim() || createMessage.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {createMessage.isPending ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
            {errorMessage && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {errorMessage}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  )
}