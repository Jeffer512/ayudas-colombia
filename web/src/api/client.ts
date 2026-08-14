import type {
  HelpOrg,
  HelpOrgFilters,
  HelpOrgItem,
  HelpOrgItemInput,
  HelpOrgListResponse,
  Aviso,
  AvisoFilters,
  AvisoListResponse,
  City,
  CreatedAviso,
  CreatedOffer,
  CreatedRequest,
  NewHelpOrg,
  NewAviso,
  NewOffer,
  NewOrgRequest,
  NewRequest,
  Offer,
  OfferFilters,
  OfferListResponse,
  RegisterResult,
  Request,
  RequestFilters,
  RequestListResponse,
  Staff,
  StatusUpdate,
} from '../lib/types'

const API_BASE = '/api'

export class ApiError extends Error {
  code?: string

  constructor(
    message: string,
    code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    let message = `Error del servidor (${res.status})`
    let code: string | undefined
    try {
      const body = await res.json()
      if (body?.error) message = body.error
      if (typeof body?.code === 'string') code = body.code
    } catch {
      /* respuesta no JSON */
    }
    throw new ApiError(message, code)
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

  helpRequest(id: string, body: { markerId?: string; name?: string; note?: string }): Promise<Request> {
    return http(`/requests/${id}/help`, {
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

  claimOffer(id: string): Promise<Offer> {
    return http(`/offers/${id}/claim`, { method: 'POST' })
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

  helpOrgs(filters: HelpOrgFilters = {}): Promise<HelpOrgListResponse> {
    return http(`/help-orgs${buildQuery(filters)}`)
  },

  helpOrg(id: string): Promise<HelpOrg> {
    return http(`/help-orgs/${id}`)
  },

  createHelpOrg(body: NewHelpOrg): Promise<HelpOrg> {
    return http('/help-orgs', { method: 'POST', body: JSON.stringify(body) })
  },

  orgMembers(id: string): Promise<{ members: Staff[] }> {
    return http(`/help-orgs/${id}/members`)
  },

  approveOrgMember(id: string, memberId: string): Promise<{ member: Staff }> {
    return http(`/help-orgs/${id}/members/${memberId}/approve`, {
      method: 'POST',
    })
  },

  rejectOrgMember(id: string, memberId: string): Promise<{ ok: boolean }> {
    return http(`/help-orgs/${id}/members/${memberId}/reject`, {
      method: 'POST',
    })
  },

  createOrgRequest(id: string, body: NewOrgRequest): Promise<CreatedRequest> {
    return http(`/help-orgs/${id}/requests`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  orgItems(orgId: string): Promise<{ items: HelpOrgItem[] }> {
    return http(`/help-orgs/${orgId}/items`)
  },

  createOrgItem(
    orgId: string,
    body: HelpOrgItemInput,
  ): Promise<{ item: HelpOrgItem }> {
    return http(`/help-orgs/${orgId}/items`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateOrgItem(
    orgId: string,
    itemId: string,
    body: HelpOrgItemInput,
  ): Promise<{ item: HelpOrgItem }> {
    return http(`/help-orgs/${orgId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  deleteOrgItem(orgId: string, itemId: string): Promise<{ ok: boolean }> {
    return http(`/help-orgs/${orgId}/items/${itemId}`, { method: 'DELETE' })
  },

  register(body: {
    email: string
    password: string
    name: string
    orgId?: string
  }): Promise<RegisterResult> {
    return http('/auth/register', { method: 'POST', body: JSON.stringify(body) })
  },

  verifyEmail(token: string): Promise<{ ok: boolean }> {
    return http('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },

  resendVerification(email: string): Promise<{ ok: boolean }> {
    return http('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  login(body: { email: string; password: string }): Promise<{ staff: Staff | null }> {
    return http('/auth/login', { method: 'POST', body: JSON.stringify(body) })
  },

  logout(): Promise<{ ok: boolean }> {
    return http('/auth/logout', { method: 'POST' })
  },

  me(): Promise<{ authenticated: boolean; staff: Staff | null }> {
    return http('/auth/me')
  },
}
