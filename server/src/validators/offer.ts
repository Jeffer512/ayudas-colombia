import { z } from 'zod'
import {
  OFFER_STATUSES,
  OFFER_TYPES,
  TRANSPORT_OPTIONS,
} from '../constants.js'
import { cityCodeSchema, coordinatesSchema, reporterSchema } from './common.js'

export const createOfferSchema = z.object({
  type: z.enum(OFFER_TYPES, { message: 'Tipo de oferta inválido' }),
  transport: z.enum(TRANSPORT_OPTIONS).optional(),
  title: z.string().trim().min(5, 'Título muy corto').max(140),
  description: z.string().trim().min(10, 'Descripción muy corta').max(4000),
  address: z.string().trim().max(300).optional(),
  ...coordinatesSchema.shape,
  cityCode: cityCodeSchema,
  reporter: reporterSchema,
})

export type CreateOfferInput = z.infer<typeof createOfferSchema>

export const offerFiltersSchema = z.object({
  type: z.enum(OFFER_TYPES).optional(),
  status: z.enum(['open', 'in_transit', 'fulfilled', 'unavailable', 'active']).optional(),
  forTransport: z.enum(['true', 'false']).optional(),
  city: z.string().trim().optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type OfferFilters = z.infer<typeof offerFiltersSchema>

export const updateOfferStatusSchema = z.object({
  status: z.enum(OFFER_STATUSES),
  resolveCode: z.string().trim().min(4).max(6).optional(),
  note: z.string().trim().max(2000).optional(),
  actorName: z.string().trim().max(120).optional(),
})

export type UpdateOfferStatusInput = z.infer<typeof updateOfferStatusSchema>