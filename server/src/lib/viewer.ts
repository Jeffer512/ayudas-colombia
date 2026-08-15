import type { SessionPayload } from './jwt.js'
import type { ContactVisibility, OfferAudience } from '../constants.js'

export interface Viewer {
  sub: string | null
  orgId: string | null
}

export function viewerFromSession(session: SessionPayload | null | undefined): Viewer {
  if (!session) return { sub: null, orgId: null }
  return { sub: session.sub, orgId: session.orgId || null }
}

export function isOwner(viewer: Viewer | undefined, userId: string | null): boolean {
  return viewer != null && viewer.sub != null && userId != null && viewer.sub === userId
}

export function canSeeContact(
  visibility: ContactVisibility,
  viewer: Viewer | undefined,
  ownerId: string | null,
): boolean {
  if (isOwner(viewer, ownerId)) return true
  return visibility === 'users' ? viewer?.sub != null : true
}

export function offerVisibleToAudience(
  audience: OfferAudience,
  viewer: Viewer | undefined,
): boolean {
  if (audience === 'public') return true
  if (!viewer || viewer.sub == null) return false
  if (audience === 'users') return true
  return audience === 'orgs' && viewer.orgId != null
}