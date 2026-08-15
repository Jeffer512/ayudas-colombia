import { z } from 'zod'
import { URGENCIES } from '../constants.js'
import {
  anonymousReporterSchema,
  cityCodeSchema,
  contactVisibilitySchema,
  coordinatesSchema,
} from './common.js'

export const createAvisoSchema = z.object({
  title: z.string().trim().min(5, 'Título muy corto').max(140),
  description: z.string().trim().min(10, 'Descripción muy corta').max(4000),
  urgency: z.enum(URGENCIES).default('medium'),
  address: z.string().trim().max(300).optional(),
  ...coordinatesSchema.shape,
  cityCode: cityCodeSchema,
  reporter: anonymousReporterSchema,
  contactVisibility: contactVisibilitySchema,
})

export type CreateAvisoInput = z.infer<typeof createAvisoSchema>

export const avisoFiltersSchema = z.object({
  urgency: z.enum(URGENCIES).optional(),
  status: z.enum(['open', 'closed', 'active']).optional(),
  city: z.string().trim().optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type AvisoFilters = z.infer<typeof avisoFiltersSchema>

export const avisoMarkSchema = z.object({
  markerId: z.string().trim().max(100).optional(),
})