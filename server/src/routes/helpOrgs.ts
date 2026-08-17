import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { isAdminToken } from '../lib/admin.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import {
  currentSession,
  requireOrgStaff,
  requireSession,
} from '../middleware/requireSession.js'
import { setSessionCookie } from '../lib/cookies.js'
import {
  approveMember,
  createHelpOrg,
  createOrgItem,
  createOrgRequest,
  deleteOrgItem,
  getHelpOrg,
  joinHelpOrg,
  listHelpOrgs,
  listMembers,
  listOrgItems,
  rejectMember,
  updateOrgItem,
  updateHelpOrgStatus,
} from '../services/helpOrgs.js'
import {
  createHelpOrgSchema,
  createOrgRequestSchema,
  helpOrgFiltersSchema,
  updateHelpOrgStatusSchema,
  upsertHelpOrgItemSchema,
} from '../validators/helpOrg.js'

const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas organizaciones creadas, intenta más tarde' },
})

export const helpOrgsRouter = Router()

helpOrgsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = helpOrgFiltersSchema.parse(req.query)
    res.json(await listHelpOrgs(filters))
  }),
)

helpOrgsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getHelpOrg(String(req.params.id)))
  }),
)

helpOrgsRouter.post(
  '/',
  createLimiter,
  asyncHandler(async (req, res) => {
    const input = createHelpOrgSchema.parse(req.body)
    const session = currentSession(req)
    const isAdmin = isAdminToken(
      req.header('x-admin-token'),
      process.env.ADMIN_TOKEN ?? '',
    )
    const type = isAdmin ? 'oficial' : 'ciudadano'
    const created = await createHelpOrg(input, type, {
      userId: session?.sub,
      claim: input.claim,
    })
    if (created.membership && session) {
      setSessionCookie(res, {
        sub: session.sub,
        orgId: created.membership.orgId,
        role: created.membership.role,
        membershipId: created.membership.id,
      })
    }
    const { membership: _membership, ...body } = created
    res.status(201).json(body)
  }),
)

helpOrgsRouter.post(
  '/:id/join',
  requireSession,
  asyncHandler(async (req, res) => {
    const result = await joinHelpOrg(
      String(req.params.id),
      req.session!.sub,
    )
    if (result.membership.status === 'active') {
      setSessionCookie(res, {
        sub: req.session!.sub,
        orgId: result.membership.orgId,
        role: result.membership.role,
        membershipId: result.membership.id,
      })
    }
    res.status(201).json({ membership: result.membership })
  }),
)

helpOrgsRouter.post(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const input = updateHelpOrgStatusSchema.parse(req.body)
    const isAdmin = isAdminToken(
      req.header('x-admin-token'),
      process.env.ADMIN_TOKEN ?? '',
    )
    res.json(await updateHelpOrgStatus(String(req.params.id), input, isAdmin))
  }),
)

helpOrgsRouter.get(
  '/:id/members',
  requireOrgStaff('id'),
  asyncHandler(async (req, res) => {
    res.json({ members: await listMembers(String(req.params.id)) })
  }),
)

helpOrgsRouter.post(
  '/:id/members/:memberId/approve',
  requireOrgStaff('id'),
  asyncHandler(async (req, res) => {
    const member = await approveMember(
      String(req.params.id),
      String(req.params.memberId),
      req.session!.role,
    )
    res.json({ member })
  }),
)

helpOrgsRouter.post(
  '/:id/members/:memberId/reject',
  requireOrgStaff('id'),
  asyncHandler(async (req, res) => {
    res.json(
      await rejectMember(
        String(req.params.id),
        String(req.params.memberId),
        req.session!.role,
      ),
    )
  }),
)

helpOrgsRouter.post(
  '/:id/requests',
  requireOrgStaff('id'),
  asyncHandler(async (req, res) => {
    const input = createOrgRequestSchema.parse(req.body)
    res.status(201).json(await createOrgRequest(String(req.params.id), input))
  }),
)

helpOrgsRouter.get(
  '/:id/items',
  asyncHandler(async (req, res) => {
    res.json({ items: await listOrgItems(String(req.params.id)) })
  }),
)

helpOrgsRouter.post(
  '/:id/items',
  requireOrgStaff('id'),
  asyncHandler(async (req, res) => {
    const input = upsertHelpOrgItemSchema.parse(req.body)
    const item = await createOrgItem(
      String(req.params.id),
      input,
      req.session!.membershipId!,
    )
    res.status(201).json({ item })
  }),
)

helpOrgsRouter.put(
  '/:id/items/:itemId',
  requireOrgStaff('id'),
  asyncHandler(async (req, res) => {
    const input = upsertHelpOrgItemSchema.parse(req.body)
    const item = await updateOrgItem(
      String(req.params.id),
      String(req.params.itemId),
      input,
      req.session!.membershipId!,
    )
    res.json({ item })
  }),
)

helpOrgsRouter.delete(
  '/:id/items/:itemId',
  requireOrgStaff('id'),
  asyncHandler(async (req, res) => {
    res.json(
      await deleteOrgItem(
        String(req.params.id),
        String(req.params.itemId),
      ),
    )
  }),
)
