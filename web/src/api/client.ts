import type {
  City,
  NewReport,
  Report,
  ReportFilters,
  ReportListResponse,
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

function buildQuery(filters: ReportFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const api = {
  cities(): Promise<{ cities: City[] }> {
    return http('/cities')
  },

  reports(filters: ReportFilters): Promise<ReportListResponse> {
    return http(`/reports${buildQuery(filters)}`)
  },

  report(id: string): Promise<Report> {
    return http(`/reports/${id}`)
  },

  createReport(body: NewReport): Promise<Report> {
    return http('/reports', { method: 'POST', body: JSON.stringify(body) })
  },

  updateStatus(id: string, body: StatusUpdate): Promise<Report> {
    return http(`/reports/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}