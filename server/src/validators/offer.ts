import { z } from 'zod'
import {
  OFFER_STATUSES,
  OFFER_TYPES,
  TRANSPORT_OPTIONS,
} from '../constants.js'
import {
  cityCodeSchema,
  contactVisibilitySchema,
  coordinatesSchema,
  reporterSchema,
  tagListSchema,
} from './common.js'

export const createOfferSchema = z.object({
  type: z.enum(OFFER_TYPES, { message: 'Tipo de oferta inválido' }),
  transport: z.enum(TRANSPORT_OPTIONS).optional(),
  items: tagListSchema.optional(),
  zone: z.string().trim().max(80, 'Zona muy larga').optional(),
  volunteer: z
    .object({
      capabilities: tagListSchema.optional(),
      availability: z.string().trim().max(200, 'Disponibilidad muy larga').optional(),
    })
    .strict()
    .optional(),
  vehicle: z
    .object({
      vehicleType: z.string().trim().max(40, 'Tipo de vehículo muy largo').optional(),
      capacity: z.string().trim().max(60, 'Capacidad muy larga').optional(),
    })
    .strict()
    .optional(),
  title: z.string().trim().min(5, 'Título muy corto').max(140),
  description: z
    .string()
    .trim()
    .max(4000, 'Descripción muy larga')
    .optional()
    .transform((value) => value || null),
  address: z.string().trim().max(300).optional(),
  ...coordinatesSchema.shape,
  cityCode: cityCodeSchema,
  reporter: reporterSchema,
  contactVisibility: contactVisibilitySchema,
  audience: z
    .enum(['public', 'users', 'orgs'], { message: 'Audiencia inválida' })
    .optional(),
})

export type CreateOfferInput = z.infer<typeof createOfferSchema>

export const updateOfferSchema = z.object({
  title: z.string().trim().min(5, 'Título muy corto').max(140),
  description: z
    .string()
    .trim()
    .max(4000, 'Descripción muy larga')
    .optional()
    .transform((value) => value || null),
  items: tagListSchema.optional(),
  zone: z.string().trim().max(80, 'Zona muy larga').nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  volunteer: z
    .object({
      capabilities: tagListSchema.optional(),
      availability: z
        .string()
        .trim()
        .max(200, 'Disponibilidad muy larga')
        .nullable()
        .optional(),
    })
    .strict()
    .nullable()
    .optional(),
  vehicle: z
    .object({
      vehicleType: z
        .string()
        .trim()
        .max(40, 'Tipo de vehículo muy largo')
        .nullable()
        .optional(),
      capacity: z
        .string()
        .trim()
        .max(60, 'Capacidad muy larga')
        .nullable()
        .optional(),
    })
    .strict()
    .nullable()
    .optional(),
  reporter: reporterSchema.optional(),
  contactVisibility: contactVisibilitySchema.optional(),
  audience: z
    .enum(['public', 'users', 'orgs'], { message: 'Audiencia inválida' })
    .optional(),
  transport: z.enum(TRANSPORT_OPTIONS).nullable().optional(),
  resolveCode: z.string().trim().min(4).max(6).optional(),
})

export type UpdateOfferInput = z.infer<typeof updateOfferSchema>

export const verifyResolveCodeSchema = z.object({
  resolveCode: z.string().trim().min(4, 'Código de cierre incorrecto').max(6),
})

export type VerifyResolveCodeInput = z.infer<typeof verifyResolveCodeSchema>

export const offerFiltersSchema = z.object({
  type: z.enum(OFFER_TYPES).optional(),
  status: z.enum(['open', 'in_transit', 'fulfilled', 'unavailable', 'active']).optional(),
  forTransport: z.enum(['true', 'false', 'assigned']).optional(),
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