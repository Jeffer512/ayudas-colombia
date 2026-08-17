import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import RequestForm from '../components/RequestForm'
import type { UpdateRequest } from '../lib/types'

export default function RequestEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: request, isPending, isError } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.request(id),
    retry: false,
  })

  if (isPending) {
    return <p role="status">Cargando pedido…</p>
  }

  if (isError || !request) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-6 text-center text-red-700 dark:text-red-300">
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
        <Link to={`/pedido/${id}`} className="text-sm text-sky-700 hover:underline">
          ← Volver al pedido
        </Link>
        <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-6 text-center">
          <h1 className="text-xl font-bold text-amber-900 dark:text-amber-300">
            No se puede editar este pedido
          </h1>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">{blocked}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/pedido/${id}`} className="text-sm text-sky-700 hover:underline">
        ← Volver al pedido
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Editar pedido</h1>
      <p className="mt-1 text-sm text-text-muted">
        Corrige los datos para que la ayuda llegue mejor.
      </p>
      <RequestForm
        mode="edit"
        initial={request}
        requireCode={request.isOwner !== true}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        onSubmit={(body) =>
          api
            .updateRequest(id, body as UpdateRequest)
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