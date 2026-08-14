export const REQUEST_TYPES = [
  'missing_person',
  'missing_pet',
  'supplies_request',
  'volunteers_request',
  'shelter_request',
  'medical_request',
  'transport_request',
] as const
export type RequestType = (typeof REQUEST_TYPES)[number]

export const OFFER_TYPES = [
  'supplies_offered',
  'volunteers_offered',
  'shelter_offered',
  'transport_offered',
] as const
export type OfferType = (typeof OFFER_TYPES)[number]

export const ACOPIO_TYPES = ['ciudadano', 'oficial'] as const
export type AcopioType = (typeof ACOPIO_TYPES)[number]

export const URGENCIES = ['critical', 'high', 'medium', 'low'] as const
export type Urgency = (typeof URGENCIES)[number]

export const TRANSPORT_OPTIONS = ['can_transport', 'needs_transport'] as const
export type TransportOption = (typeof TRANSPORT_OPTIONS)[number]

export const REQUEST_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'duplicate',
  'invalid',
] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export const OFFER_STATUSES = ['open', 'fulfilled', 'unavailable'] as const
export type OfferStatus = (typeof OFFER_STATUSES)[number]

export const AVISO_STATUSES = ['open', 'closed'] as const
export type AvisoStatus = (typeof AVISO_STATUSES)[number]

export const ACOPIO_STATUSES = ['open', 'closed'] as const
export type AcopioStatus = (typeof ACOPIO_STATUSES)[number]

export const CONTACT_TYPES = ['individual', 'organization'] as const
export type ContactType = (typeof CONTACT_TYPES)[number]

export const ORGANIZATION_TYPES = [
  'shelter',
  'volunteer_group',
  'government',
  'ngo',
  'business',
  'other',
] as const
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]