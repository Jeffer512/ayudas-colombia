export type RequestType =
  | 'missing_person'
  | 'missing_pet'
  | 'supplies_request'
  | 'volunteers_request'
  | 'shelter_request'
  | 'medical_request'
  | 'transport_request'

export type OfferType =
  | 'supplies_offered'
  | 'volunteers_offered'
  | 'shelter_offered'
  | 'transport_offered'

export type AvisoType = 'info'

export type TransportOption = 'can_transport' | 'needs_transport'

export type Urgency = 'critical' | 'high' | 'medium' | 'low'

export type RequestStatus = 'open' | 'in_progress' | 'resolved' | 'duplicate' | 'invalid'
export type OfferStatus = 'open' | 'fulfilled' | 'unavailable'
export type AvisoStatus = 'open' | 'closed'

export interface City {
  id: number
  code: string
  name: string
  department: string | null
  centerLat: number | null
  centerLng: number | null
}

export interface RequestEvent {
  id: string
  status: RequestStatus
  note: string | null
  actorName: string | null
  createdAt: string
}

export interface Reporter {
  name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
}

export interface CityRef {
  code: string
  name: string
}

export interface Request {
  id: string
  type: RequestType
  transport: TransportOption | null
  urgency: Urgency
  status: RequestStatus
  title: string
  description: string
  address: string | null
  lat: number | null
  lng: number | null
  city: CityRef
  reporter: Reporter
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  events?: RequestEvent[]
}

export interface Offer {
  id: string
  type: OfferType
  transport: TransportOption | null
  status: OfferStatus
  title: string
  description: string
  address: string | null
  lat: number | null
  lng: number | null
  city: CityRef
  reporter: Reporter
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Aviso {
  id: string
  type: AvisoType
  urgency: Urgency
  status: AvisoStatus
  title: string
  description: string
  address: string | null
  lat: number | null
  lng: number | null
  city: CityRef
  reporter: Reporter
  marks: number
  createdAt: string
  updatedAt: string
}

export interface CreatedRequest extends Request {
  resolveCode: string
}

export interface CreatedOffer extends Offer {
  resolveCode: string
}

export interface CreatedAviso extends Aviso {}

export interface RequestListResponse {
  requests: Request[]
  total: number
  limit: number
  offset: number
}

export interface OfferListResponse {
  offers: Offer[]
  total: number
  limit: number
  offset: number
}

export interface AvisoListResponse {
  avisos: Aviso[]
  total: number
  limit: number
  offset: number
}

interface BaseFilters {
  status?: string
  city?: string
  q?: string
  limit?: number
  offset?: number
}

export interface RequestFilters extends BaseFilters {
  type?: RequestType
  status?: RequestStatus | 'active'
  urgency?: Urgency
}

export interface OfferFilters extends BaseFilters {
  type?: OfferType
  status?: OfferStatus | 'active'
}

export interface AvisoFilters extends BaseFilters {
  status?: AvisoStatus | 'active'
  urgency?: Urgency
}

export type NewRequest = {
  type: RequestType
  urgency: Urgency
  transport?: TransportOption
  title: string
  description: string
  address?: string
  lat?: number
  lng?: number
  cityCode: string
  reporter: ReporterInput
}

export type NewOffer = {
  type: OfferType
  transport?: TransportOption
  title: string
  description: string
  address?: string
  lat?: number
  lng?: number
  cityCode: string
  reporter: ReporterInput
}

export type NewAviso = {
  urgency: Urgency
  title: string
  description: string
  address?: string
  lat?: number
  lng?: number
  cityCode: string
  reporter: ReporterInput
}

type ReporterInput = {
  name: string
  phone?: string
  whatsapp?: string
  email?: string
}

export type StatusUpdate = {
  status: string
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
  city: CityRef
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
