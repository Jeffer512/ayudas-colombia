export const REPORT_TYPES = [
  'missing_person',
  'missing_pet',
  'supplies_request',
  'volunteers_request',
  'shelter_request',
  'shelter_offered',
  'medical_request',
  'damage_report',
  'aid_offered',
  'info',
] as const
export type ReportType = (typeof REPORT_TYPES)[number]

export const URGENCIES = ['critical', 'high', 'medium', 'low'] as const
export type Urgency = (typeof URGENCIES)[number]

export const STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'duplicate',
  'invalid',
] as const
export type Status = (typeof STATUSES)[number]

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