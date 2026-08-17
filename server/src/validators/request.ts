import { z } from 'zod'
import {
  REQUEST_STATUSES,
  REQUEST_TYPES,
  TRANSPORT_OPTIONS,
  URGENCIES,
} from '../constants.js'
import { cityCodeSchema, contactVisibilitySchema, coordinatesSchema, reporterSchema, tagListSchema } from './common.js'

const PHOTO_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]*={0,2}$/

export const photoDataUrlSchema = z
  .string()
  .trim()
  .regex(PHOTO_DATA_URL, 'Foto inválida')
  .max(8_000_000, 'La foto es demasiado grande')

const base = z.object({
  title: z.string().trim().min(5, 'Título muy corto').max(140),
  description: z
    .string()
    .trim()
    .max(4000, 'Descripción muy larga')
    .optional()
    .transform((value) => value || null),
  photo: photoDataUrlSchema.optional(),
  address: z.string().trim().max(300).optional(),
  ...coordinatesSchema.shape,
  cityCode: cityCodeSchema,
  reporter: reporterSchema,
  contactVisibility: contactVisibilitySchema,
})

export const createRequestSchema = base.extend({
  type: z.enum(REQUEST_TYPES, { message: 'Tipo de solicitud inválido' }),
  urgency: z.enum(URGENCIES).default('medium'),
  transport: z.enum(TRANSPORT_OPTIONS).optional(),
  items: tagListSchema.optional(),
})

export type CreateRequestInput = z.infer<typeof createRequestSchema>

export const updateRequestSchema = z.object({
  title: z.string().trim().min(5, 'Título muy corto').max(140),
  description: z
    .string()
    .trim()
    .max(4000, 'Descripción muy larga')
    .optional()
    .transform((value) => value || null),
  photo: z.union([photoDataUrlSchema, z.null()]).optional(),
  address: z.string().trim().max(300).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  reporter: reporterSchema.optional(),
  contactVisibility: contactVisibilitySchema.optional(),
  urgency: z.enum(URGENCIES).optional(),
  transport: z.enum(TRANSPORT_OPTIONS).nullable().optional(),
  items: tagListSchema.optional(),
  resolveCode: z.string().trim().min(4).max(6).optional(),
})

export type UpdateRequestInput = z.infer<typeof updateRequestSchema>

export const verifyResolveCodeSchema = z.object({
  resolveCode: z.string().trim().min(4, 'Código de cierre incorrecto').max(6),
})

export type VerifyResolveCodeInput = z.infer<typeof verifyResolveCodeSchema>

export const requestFiltersSchema = z.object({
  type: z.enum(REQUEST_TYPES).optional(),
  status: z
    .enum(['open', 'resolved', 'duplicate', 'invalid', 'active'])
    .optional(),
  urgency: z.enum(URGENCIES).optional(),
  city: z.string().trim().optional(),
  org: z.string().trim().optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type RequestFilters = z.infer<typeof requestFiltersSchema>

export const updateRequestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  resolveCode: z.string().trim().max(6).optional(),
  note: z.string().trim().max(2000).optional(),
  actorName: z.string().trim().max(120).optional(),
})

export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>

export const helpRequestSchema = z.object({
  markerId: z.string().trim().max(100).optional(),
  name: z.string().trim().max(120).optional(),
  note: z.string().trim().max(2000).optional(),
})

export type HelpRequestInput = z.infer<typeof helpRequestSchema>