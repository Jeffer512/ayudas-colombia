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
export type OfferStatus = 'open' | 'in_transit' | 'fulfilled' | 'unavailable'
export type AvisoStatus = 'open' | 'closed'
export type HelpOrgCategory = 'acopio' | 'psicologia' | 'voluntarios' | 'albergue' | 'other'
export type HelpOrgType = 'ciudadano' | 'oficial'
export type HelpOrgStatus = 'open' | 'closed'
export type HelpOrgItemKind = 'available' | 'needed'

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

export interface RequestHelper {
  name: string | null
  note: string | null
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
  isOwner?: boolean
  type: RequestType
  transport: TransportOption | null
  urgency: Urgency
  status: RequestStatus
  title: string
  description: string
  photo?: string | null
  address: string | null
  lat: number | null
  lng: number | null
  city: CityRef
  reporter: Reporter
  organization?: { id: string; name: string; category: HelpOrgCategory }
  helpers: number
  helperList?: RequestHelper[]
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  events?: RequestEvent[]
}

export interface OfferClaim {
  id: string
  status: 'committed' | 'delivered' | 'cancelled'
  claimerName: string | null
  mine: boolean
  note: string | null
  claimedAt: string
}

export interface Offer {
  id: string
  isOwner?: boolean
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
  claim: OfferClaim | null
  canClaim: boolean
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
  org?: string
}

export interface OfferFilters extends BaseFilters {
  type?: OfferType
  status?: OfferStatus | 'active'
  forTransport?: boolean | 'assigned'
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
  photo?: string
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

export interface HelpOrg {
  id: string
  type: HelpOrgType
  category: HelpOrgCategory
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
  status: HelpOrgStatus
  items?: HelpOrgItem[]
  createdAt: string
  updatedAt: string
}

export interface HelpOrgItem {
  id: string
  orgId: string
  kind: HelpOrgItemKind
  name: string
  quantity: number | null
  unit: string | null
  updatedBy: string | null
  updatedAt: string
  createdAt: string
}

export type HelpOrgItemInput = {
  kind: HelpOrgItemKind
  name: string
  quantity?: number | null
  unit?: string | null
}

export interface HelpOrgListResponse {
  helpOrgs: HelpOrg[]
  total: number
  limit: number
  offset: number
}

export interface HelpOrgFilters {
  city?: string
  category?: HelpOrgCategory
  type?: HelpOrgType
  status?: HelpOrgStatus
}

export type NewHelpOrg = {
  name: string
  description?: string
  address?: string
  lat: number
  lng: number
  cityCode: string
  category: HelpOrgCategory
  contactName?: string
  contactPhone?: string
  hours?: string
  accepts?: string
}

export interface Staff {
  id: string
  userId: string
  email: string
  name: string
  role: 'manager' | 'member'
  orgId: string
  status: 'active' | 'pending'
}

export interface RegisterResult {
  verificationUrl?: string | null
}

export type NewOrgRequest = {
  type: RequestType
  urgency?: Urgency
  transport?: TransportOption
  title: string
  description: string
  address?: string
  lat?: number
  lng?: number
  cityCode: string
}