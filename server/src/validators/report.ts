import { z } from 'zod'
import {
  CONTACT_TYPES,
  ORGANIZATION_TYPES,
  REPORT_TYPES,
  URGENCIES,
} from '../constants.js'

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

export const createReportSchema = z.object({
  type: z.enum(REPORT_TYPES, { message: 'Tipo de reporte inválido' }),
  urgency: z.enum(URGENCIES).default('medium'),
  title: z.string().trim().min(5, 'Título muy corto').max(140),
  description: z.string().trim().min(10, 'Descripción muy corta').max(4000),
  address: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  cityCode: z
    .string()
    .trim()
    .min(1, 'Ciudad requerida')
    .max(60),
  reporter: reporterSchema,
})

export type CreateReportInput = z.infer<typeof createReportSchema>

export const reportFiltersSchema = z.object({
  type: z.enum(REPORT_TYPES).optional(),
  status: z
    .enum(['open', 'in_progress', 'resolved', 'duplicate', 'invalid', 'active'])
    .optional(),
  urgency: z.enum(URGENCIES).optional(),
  city: z.string().trim().optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type ReportFilters = z.infer<typeof reportFiltersSchema>

export const updateStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'duplicate', 'invalid']),
  resolveCode: z.string().trim().max(6).optional(),
  note: z.string().trim().max(2000).optional(),
  actorName: z.string().trim().max(120).optional(),
})

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>