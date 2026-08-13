export type Direction = 'need' | 'offer' | 'info'

export type ReportType =
  | 'missing_person'
  | 'missing_pet'
  | 'supplies_request'
  | 'volunteers_request'
  | 'shelter_request'
  | 'medical_request'
  | 'transport_request'
  | 'supplies_offered'
  | 'volunteers_offered'
  | 'shelter_offered'
  | 'transport_offered'
  | 'damage_report'
  | 'info'

export type Urgency = 'critical' | 'high' | 'medium' | 'low'

export type Status = 'open' | 'in_progress' | 'resolved' | 'duplicate' | 'invalid'

export type ContactType = 'individual' | 'organization'

export interface City {
  id: number
  code: string
  name: string
  department: string | null
  centerLat: number | null
  centerLng: number | null
}

export interface ReportEvent {
  id: string
  status: Status
  note: string | null
  actorName: string | null
  createdAt: string
}

export interface Reporter {
  contactType: ContactType
  name: string
  organizationName: string | null
  organizationType: string | null
  phone: string | null
}

export interface Report {
  id: string
  direction: Direction
  type: ReportType
  urgency: Urgency
  status: Status
  title: string
  description: string
  address: string | null
  lat: number | null
  lng: number | null
  city: { code: string; name: string }
  reporter: Reporter
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  events?: ReportEvent[]
}

export interface CreatedReport extends Report {
  resolveCode: string
}

export interface ReportListResponse {
  reports: Report[]
  total: number
  limit: number
  offset: number
}

export interface ReportFilters {
  direction?: Direction
  type?: ReportType
  status?: Status | 'active'
  urgency?: Urgency
  city?: string
  q?: string
  limit?: number
  offset?: number
}

export type NewReport = {
  type: ReportType
  urgency: Urgency
  title: string
  description: string
  address?: string
  lat?: number
  lng?: number
  cityCode: string
  reporter: {
    contactType: ContactType
    name: string
    organizationName?: string
    organizationType?: string
    phone: string
    email?: string
  }
}

export type StatusUpdate = {
  status: Status
  resolveCode?: string
  note?: string
  actorName?: string
}

export type AcopioType = 'ciudadano' | 'oficial'
export type AcopioStatus = 'open' | 'closed'

export interface AcopioCenter {
  id: string
  type: AcopioType
  name: string
  description: string | null
  address: string | null
  lat: number | null
  lng: number | null
  city: { code: string; name: string }
  contactName: string | null
  contactPhone: string | null
  hours: string | null
  accepts: string | null
  status: AcopioStatus
  createdAt: string
  updatedAt: string
}

export interface AcopioListResponse {
  acopios: AcopioCenter[]
  total: number
  limit: number
  offset: number
}

export interface AcopioFilters {
  city?: string
  type?: AcopioType
  status?: AcopioStatus
}

export type NewAcopio = {
  name: string
  description?: string
  address?: string
  lat: number
  lng: number
  cityCode: string
  contactName?: string
  contactPhone?: string
  hours?: string
  accepts?: string
}