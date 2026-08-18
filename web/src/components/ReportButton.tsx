import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { NewReport, ReportReason } from '../lib/types'

const REASON_LABELS: Record<ReportReason, string> = {
 fake: 'Contenido falso o engañoso',
 unreachable: 'No se puede contactar con los datos publicados',
 spam: 'Publicación repetida o publicidad',
 wrong: 'Datos incorrectos o desactualizados',
 other: 'Otro motivo',
}

const REASONS = Object.keys(REASON_LABELS) as ReportReason[]

interface ReportButtonProps {
 kind: NewReport['kind']
 targetId: string
}

export default function ReportButton({ kind, targetId }: ReportButtonProps) {
 const me = useQuery({
 queryKey: ['me'],
 queryFn: api.me,
 retry: false,
 staleTime: 60_000,
 })
 const [open, setOpen] = useState(false)
 const [reason, setReason] = useState<ReportReason | null>(null)
 const [note, setNote] = useState('')

 const mutation = useMutation({
 mutationFn: (body: NewReport) => api.createReport(body),
 })

 if (me.isPending) return null

 if (me.data?.authenticated !== true) {
 return (
 <p className="text-sm text-fg-muted">
 <Link to="/iniciar-sesion" className="underline">
 Inicia sesión
 </Link>{' '}
 para reportar esta publicación
 </p>
 )
 }

 return (
 <div>
 {!open && (
 <button
 type="button"
 onClick={() => setOpen(true)}
 className="text-sm text-danger underline hover:text-danger dark:hover:text-danger"
 >
 Reportar
 </button>
 )}

 {open && mutation.isSuccess && (
 <p className="rounded-md bg-danger-muted p-3 text-sm text-danger">
 Gracias, tu reporte fue enviado y será revisado.
 </p>
 )}

 {open && !mutation.isSuccess && (
 <form
 onSubmit={(e) => {
 e.preventDefault()
 if (reason) mutation.mutate({ kind, targetId, reason, note: note.trim() || undefined })
 }}
 className="mt-2 space-y-3 rounded-lg border border-danger-muted bg-danger-muted p-4"
 >
 <p className="text-sm font-semibold text-danger">
 ¿Por qué quieres reportar esta publicación?
 </p>
 <p className="text-xs text-danger">
 El equipo de moderación lo revisará. Los reportes se envían de forma
 anónima para los demás usuarios.
 </p>

 <fieldset className="space-y-1.5">
 <legend className="sr-only">Motivo del reporte</legend>
 {REASONS.map((value) => (
 <label key={value} className="flex items-center gap-2 text-sm text-danger">
 <input
 type="radio"
 name="reportReason"
 value={value}
 checked={reason === value}
 onChange={() => setReason(value)}
 className="h-4 w-4"
 />
 {REASON_LABELS[value]}
 </label>
 ))}
 </fieldset>

 <div>
 <label htmlFor="reportNote" className="text-sm font-medium text-danger">
 Detalle (opcional)
 </label>
 <textarea
 id="reportNote"
 rows={3}
 maxLength={1000}
 placeholder="Ej: el teléfono no contesta y tres personas reportan lo mismo"
 value={note}
 onChange={(e) => setNote(e.target.value)}
 className="mt-1 w-full rounded-md border border-danger-muted bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-danger"
 />
 </div>

 {mutation.isError && (
 <div role="alert" className="rounded-md border border-danger-muted bg-danger-muted p-3 text-sm text-danger">
 {(mutation.error as Error).message}
 </div>
 )}

 <div className="flex gap-2">
 <button
 type="submit"
 disabled={!reason || mutation.isPending}
 className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger-hover disabled:opacity-50"
 >
 {mutation.isPending ? 'Enviando…' : 'Enviar reporte'}
 </button>
 <button
 type="button"
 onClick={() => {
 setOpen(false)
 setNote('')
 setReason(null)
 }}
 className="rounded-md border border-danger-muted bg-surface px-4 py-2 text-sm text-danger hover:bg-danger-muted"
 >
 Cancelar
 </button>
 </div>
 </form>
 )}
 </div>
 )
}