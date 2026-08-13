export type ReportType =
  | 'missing_person'
  | 'missing_pet'
  | 'supplies_request'
  | 'volunteers_request'
  | 'shelter_request'
  | 'shelter_offered'
  | 'medical_request'
  | 'damage_report'
  | 'aid_offered'
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

export interface ReportListResponse {
  reports: Report[]
  total: number
  limit: number
  offset: number
}

export interface ReportFilters {
  type?: ReportType
  status?: Status
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
  phoneVerify?: string
  note?: string
  actorName?: string
}