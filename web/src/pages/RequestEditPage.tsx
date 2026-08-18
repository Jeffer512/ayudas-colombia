import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import RequestForm from '../components/RequestForm'
import type { UpdateRequest } from '../lib/types'

const inputClass =
 'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

export default function RequestEditPage() {
 const { id = '' } = useParams()
 const navigate = useNavigate()
 const location = useLocation()
 const queryClient = useQueryClient()
 const stateCode =
 (location.state as { resolveCode?: string } | null)?.resolveCode ?? ''
 const [verifiedCode, setVerifiedCode] = useState(stateCode)

 const { data: request, isPending, isError } = useQuery({
 queryKey: ['request', id],
 queryFn: () => api.request(id),
 retry: false,
 })

 const [gateCode, setGateCode] = useState('')
 const [gateError, setGateError] = useState<string | null>(null)

 const verifyMutation = useMutation({
 mutationFn: (code: string) => api.verifyRequestCode(id, code),
 onSuccess: (_data, code) => {
 setVerifiedCode(code)
 setGateError(null)
 },
 onError: (err: Error) => setGateError(err.message),
 })

 if (isPending) {
 return <p role="status">Cargando pedido…</p>
 }

 if (isError || !request) {
 return (
 <div className="rounded-lg border border-danger-muted bg-danger-muted p-6 text-center text-danger">
 <p className="font-medium">No encontramos este pedido</p>
 <Link to="/" className="mt-2 inline-block text-sm underline">
 Volver al mapa
 </Link>
 </div>
 )
 }

 let blocked: string | null = null
 if (request.status !== 'open') {
 blocked = 'Este pedido ya no está abierto y no se puede editar.'
 } else if (request.helpers > 0) {
 blocked = 'Ya hay personas ayudando en este pedido y no se puede editar.'
 }

 if (blocked) {
 return (
 <div className="mx-auto max-w-3xl">
 <Link to={`/pedido/${id}`} className="text-sm text-primary hover:underline">
 ← Volver al pedido
 </Link>
 <div className="mt-4 rounded-lg border border-warning-muted bg-warning-muted p-6 text-center">
 <h1 className="font-display text-xl font-bold text-warning">
 No se puede editar este pedido
 </h1>
 <p className="mt-2 text-sm text-warning">{blocked}</p>
 </div>
 </div>
 )
 }

 if (!request.isOwner && !verifiedCode) {
 return (
 <div className="mx-auto max-w-3xl">
 <Link to={`/pedido/${id}`} className="text-sm text-primary hover:underline">
 ← Volver al pedido
 </Link>
 <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">Editar pedido</h1>
 <div className="mt-4 rounded-lg border border-border bg-surface p-4">
 <p className="text-sm text-fg-muted">
 Este pedido no está asociado a tu cuenta. Para editarlo necesitas el
 código de cierre que se entregó al publicarlo.
 </p>
 <form
 onSubmit={(e) => {
 e.preventDefault()
 if (gateCode.trim()) verifyMutation.mutate(gateCode.trim())
 }}
 className="mt-3 space-y-3"
 >
 {gateError && (
 <div
 role="alert"
 className="rounded-md border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
 >
 {gateError}
 </div>
 )}
 <div>
 <label htmlFor="resolveCode" className="text-sm font-medium text-fg-muted">
 Código de cierre (4 dígitos)
 </label>
 <input
 id="resolveCode"
 required
 minLength={4}
 maxLength={4}
 placeholder="1234"
 value={gateCode}
 onChange={(e) => setGateCode(e.target.value)}
 className={`mt-1 ${inputClass}`}
 />
 </div>
 <div className="flex gap-2">
 <button
 type="submit"
 disabled={verifyMutation.isPending}
 className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
 >
 {verifyMutation.isPending ? 'Verificando…' : 'Verificar código'}
 </button>
 <button
 type="button"
 onClick={() => navigate(`/pedido/${id}`)}
 className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-fg-muted hover:bg-bg"
 >
 Cancelar
 </button>
 </div>
 </form>
 </div>
 </div>
 )
 }

 return (
 <div className="mx-auto max-w-3xl">
 <Link to={`/pedido/${id}`} className="text-sm text-primary hover:underline">
 ← Volver al pedido
 </Link>
 <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">Editar pedido</h1>
 <p className="mt-1 text-sm text-fg-muted">
 Corrige los datos para que la ayuda llegue mejor.
 </p>
 <RequestForm
 mode="edit"
 initial={request}
 submitLabel="Guardar cambios"
 submittingLabel="Guardando…"
 onSubmit={(body) =>
 api
 .updateRequest(id, {
 ...(body as UpdateRequest),
 ...(!request.isOwner ? { resolveCode: verifiedCode } : {}),
 })
 .then(() => {
 queryClient.invalidateQueries({ queryKey: ['request', id] })
 queryClient.invalidateQueries({ queryKey: ['requests'] })
 navigate(`/pedido/${id}`)
 })
 }
 onCancel={() => navigate(`/pedido/${id}`)}
 />
 </div>
 )
}