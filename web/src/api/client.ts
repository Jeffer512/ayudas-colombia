import type {
  AcopioCenter,
  AcopioFilters,
  AcopioListResponse,
  Aviso,
  AvisoFilters,
  AvisoListResponse,
  City,
  CreatedAviso,
  CreatedOffer,
  CreatedRequest,
  NewAcopio,
  NewAviso,
  NewOffer,
  NewRequest,
  Offer,
  OfferFilters,
  OfferListResponse,
  Request,
  RequestFilters,
  RequestListResponse,
  StatusUpdate,
} from '../lib/types'

const API_BASE = '/api'

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    let message = `Error del servidor (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* respuesta no JSON */
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

function buildQuery(filters: object): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function markerId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const KEY = 'ayudas_marker_id'
  let id = window.localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(KEY, id)
  }
  return id
}

export const api = {
  cities(): Promise<{ cities: City[] }> {
    return http('/cities')
  },

  requests(filters: RequestFilters): Promise<RequestListResponse> {
    return http(`/requests${buildQuery(filters)}`)
  },

  request(id: string): Promise<Request> {
    return http(`/requests/${id}`)
  },

  createRequest(body: NewRequest): Promise<CreatedRequest> {
    return http('/requests', { method: 'POST', body: JSON.stringify(body) })
  },

  updateRequestStatus(id: string, body: StatusUpdate): Promise<Request> {
    return http(`/requests/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  offers(filters: OfferFilters): Promise<OfferListResponse> {
    return http(`/offers${buildQuery(filters)}`)
  },

  offer(id: string): Promise<Offer> {
    return http(`/offers/${id}`)
  },

  createOffer(body: NewOffer): Promise<CreatedOffer> {
    return http('/offers', { method: 'POST', body: JSON.stringify(body) })
  },

  updateOfferStatus(id: string, body: StatusUpdate): Promise<Offer> {
    return http(`/offers/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  avisos(filters: AvisoFilters): Promise<AvisoListResponse> {
    return http(`/avisos${buildQuery(filters)}`)
  },

  aviso(id: string): Promise<Aviso> {
    return http(`/avisos/${id}`)
  },

  createAviso(body: NewAviso): Promise<CreatedAviso> {
    return http('/avisos', { method: 'POST', body: JSON.stringify(body) })
  },

  markAviso(id: string, body: { markerId?: string }): Promise<Aviso> {
    return http(`/avisos/${id}/mark`, { method: 'POST', body: JSON.stringify(body) })
  },

  markerId,

  acopios(filters: AcopioFilters = {}): Promise<AcopioListResponse> {
    return http(`/acopios${buildQuery(filters)}`)
  },

  acopio(id: string): Promise<AcopioCenter> {
    return http(`/acopios/${id}`)
  },

  createAcopio(body: NewAcopio): Promise<AcopioCenter> {
    return http('/acopios', { method: 'POST', body: JSON.stringify(body) })
  },
}
