import { z } from 'zod'
import { CONTACT_TYPES, ORGANIZATION_TYPES } from '../constants.js'

export const reporterSchema = z
  .object({
    contactType: z.enum(CONTACT_TYPES),
    name: z.string().trim().min(1, 'Nombre requerido').max(120),
    organizationName: z.string().trim().max(120).optional(),
    organizationType: z.enum(ORGANIZATION_TYPES).optional(),
    phone: z.string().trim().min(3, 'Teléfono requerido').max(30),
    email: z
      .union([z.string().email('Correo inválido'), z.literal('')])
      .optional(),
  })
  .refine(
    (r) =>
      r.contactType === 'individual' ||
      (r.organizationName?.length ?? 0) >= 1,
    {
      message: 'El nombre de la organización es requerido',
      path: ['organizationName'],
    },
  )

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
})

export const cityCodeSchema = z.string().trim().min(1, 'Ciudad requerida').max(60)