import { z } from 'zod'

export const reporterSchema = z
  .object({
    name: z.string().trim().min(1, 'Nombre requerido').max(120),
    phone: z.string().trim().max(30).optional(),
    whatsapp: z.string().trim().max(40).optional(),
    email: z
      .union([z.string().email('Correo inválido'), z.literal('')])
      .optional(),
  })
  .superRefine((reporter, ctx) => {
    const phone = (reporter.phone ?? '').trim()
    const whatsapp = (reporter.whatsapp ?? '').trim()
    const email = (reporter.email ?? '').trim()
    if (!phone && !whatsapp && !email) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Deja al menos un medio de contacto: teléfono, WhatsApp o correo',
        path: ['contact'],
      })
    }
  })

export const anonymousReporterSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(120),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z
    .union([z.string().email('Correo inválido'), z.literal('')])
    .optional(),
})

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
})

export const cityCodeSchema = z.string().trim().min(1, 'Ciudad requerida').max(60)