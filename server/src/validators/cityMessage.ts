import { z } from 'zod'
import { cityCodeSchema } from './common.js'

export const createCityMessageSchema = z.object({
  city: cityCodeSchema,
  name: z.string().trim().min(1, 'Nombre requerido').max(120),
  body: z
    .string()
    .trim()
    .min(1, 'Escribe un mensaje')
    .max(280, 'El mensaje es demasiado largo'),
  markerId: z.string().trim().max(100).optional(),
})

export type CreateCityMessageInput = z.infer<typeof createCityMessageSchema>

export const cityMessageFiltersSchema = z.object({
  city: cityCodeSchema,
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  markerId: z.string().trim().max(100).optional(),
})

export type CityMessageFilters = z.infer<typeof cityMessageFiltersSchema>
