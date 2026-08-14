import { z } from 'zod'

export const createAcopioSchema = z.object({
  name: z.string().trim().min(2, 'Nombre requerido').max(140),
  description: z.string().trim().max(2000).optional(),
  address: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  cityCode: z.string().trim().min(1, 'Ciudad requerida').max(60),
  contactName: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  hours: z.string().trim().max(200).optional(),
  accepts: z.string().trim().max(2000).optional(),
})

export type CreateAcopioInput = z.infer<typeof createAcopioSchema>

export const acopioFiltersSchema = z.object({
  city: z.string().trim().optional(),
  type: z.enum(['ciudadano', 'oficial']).optional(),
  status: z.enum(['open', 'closed']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type AcopioFilters = z.infer<typeof acopioFiltersSchema>

export const updateAcopioStatusSchema = z.object({
  status: z.enum(['open', 'closed']),
  resolveCode: z.string().trim().min(4).max(6).optional(),
  note: z.string().trim().max(2000).optional(),
})

export type UpdateAcopioStatusInput = z.infer<typeof updateAcopioStatusSchema>