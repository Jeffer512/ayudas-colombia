import { z } from 'zod'
import { HELP_ORG_CATEGORIES, HELP_ORG_ITEM_KINDS } from '../constants.js'
import { contactVisibilitySchema } from './common.js'

export const createHelpOrgSchema = z.object({
  name: z.string().trim().min(2, 'Nombre requerido').max(140),
  description: z.string().trim().max(2000).optional(),
  address: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  cityCode: z.string().trim().min(1, 'Ciudad requerida').max(60),
  category: z.enum(HELP_ORG_CATEGORIES).optional(),
  contactName: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  hours: z.string().trim().max(200).optional(),
  accepts: z.string().trim().max(2000).optional(),
  claim: z.boolean().optional(),
})

export type CreateHelpOrgInput = z.infer<typeof createHelpOrgSchema>

export const helpOrgFiltersSchema = z.object({
  city: z.string().trim().optional(),
  category: z.enum(HELP_ORG_CATEGORIES).optional(),
  type: z.enum(['ciudadano', 'oficial']).optional(),
  status: z.enum(['open', 'closed']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type HelpOrgFilters = z.infer<typeof helpOrgFiltersSchema>

export const updateHelpOrgStatusSchema = z.object({
  status: z.enum(['open', 'closed']),
  resolveCode: z.string().trim().min(4).max(6).optional(),
  note: z.string().trim().max(2000).optional(),
})

export type UpdateHelpOrgStatusInput = z.infer<
  typeof updateHelpOrgStatusSchema
>

export const createOrgRequestSchema = z.object({
  type: z.string().trim().min(1).max(80),
  urgency: z.string().trim().optional(),
  transport: z.string().trim().optional(),
  title: z.string().trim().min(8).max(200),
  description: z.string().trim().min(20).max(5000),
  address: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  cityCode: z.string().trim().min(1, 'Ciudad requerida').max(60),
  contactVisibility: contactVisibilitySchema,
})

export type CreateOrgRequestInput = z.infer<typeof createOrgRequestSchema>

export const upsertHelpOrgItemSchema = z.object({
  kind: z.enum(HELP_ORG_ITEM_KINDS).default('available'),
  name: z.string().trim().min(2, 'Nombre requerido').max(120),
  quantity: z.coerce.number().int().min(0).max(1_000_000).nullish(),
  unit: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => (v ? v : undefined)),
})

export type UpsertHelpOrgItemInput = z.infer<typeof upsertHelpOrgItemSchema>