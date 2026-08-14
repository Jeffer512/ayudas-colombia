import { z } from 'zod'
import {
  REQUEST_STATUSES,
  REQUEST_TYPES,
  TRANSPORT_OPTIONS,
  URGENCIES,
} from '../constants.js'
import { cityCodeSchema, coordinatesSchema, reporterSchema } from './common.js'

const base = z.object({
  title: z.string().trim().min(5, 'Título muy corto').max(140),
  description: z.string().trim().min(10, 'Descripción muy corta').max(4000),
  address: z.string().trim().max(300).optional(),
  ...coordinatesSchema.shape,
  cityCode: cityCodeSchema,
  reporter: reporterSchema,
})

export const createRequestSchema = base.extend({
  type: z.enum(REQUEST_TYPES, { message: 'Tipo de solicitud inválido' }),
  urgency: z.enum(URGENCIES).default('medium'),
  transport: z.enum(TRANSPORT_OPTIONS).optional(),
})

export type CreateRequestInput = z.infer<typeof createRequestSchema>

export const requestFiltersSchema = z.object({
  type: z.enum(REQUEST_TYPES).optional(),
  status: z
    .enum(['open', 'in_progress', 'resolved', 'duplicate', 'invalid', 'active'])
    .optional(),
  urgency: z.enum(URGENCIES).optional(),
  city: z.string().trim().optional(),
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