import { z } from 'zod'

export const REPORT_KINDS = ['request', 'offer', 'aviso', 'org'] as const
export const REPORT_REASONS = [
  'fake',
  'unreachable',
  'spam',
  'wrong',
  'other',
] as const

export const createReportSchema = z.object({
  kind: z.enum(REPORT_KINDS, { message: 'Tipo de publicación inválido' }),
  targetId: z
    .string()
    .trim()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
      message: 'Publicación no encontrada',
    }),
  reason: z.enum(REPORT_REASONS, { message: 'Motivo inválido' }),
  note: z.string().trim().max(1000).optional(),
})

export type CreateReportInput = z.infer<typeof createReportSchema>

export const reportFiltersSchema = z.object({
  status: z.enum(['open', 'reviewed', 'all']).optional(),
  kind: z.enum(REPORT_KINDS).optional(),
})

export type ReportFilters = z.infer<typeof reportFiltersSchema>
