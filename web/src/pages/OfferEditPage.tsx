import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import OfferForm from '../components/OfferForm'
import type { UpdateOffer } from '../lib/types'

export default function OfferEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: offer, isPending, isError } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => api.offer(id),
    retry: false,
  })

  if (isPending) {
    return <p role="status">Cargando oferta…</p>
  }

  if (isError || !offer) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-6 text-center text-red-700 dark:text-red-300">
        <p className="font-medium">No encontramos esta oferta</p>
        <Link to="/" className="mt-2 inline-block text-sm underline">
          Volver al mapa
        </Link>
      </div>
    )
  }

  let blocked: string | null = null
  if (offer.claim) {
    blocked = 'Esta oferta ya tiene un compromiso de entrega y no se puede editar.'
  } else if (offer.status !== 'open') {
    blocked = 'Esta oferta ya no está abierta y no se puede editar.'
  }

  if (blocked) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link to={`/oferta/${id}`} className="text-sm text-sky-700 hover:underline">
          ← Volver a la oferta
        </Link>
        <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-6 text-center">
          <h1 className="text-xl font-bold text-amber-900 dark:text-amber-300">
            No se puede editar esta oferta
          </h1>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">{blocked}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/oferta/${id}`} className="text-sm text-sky-700 hover:underline">
        ← Volver a la oferta
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Editar oferta</h1>
      <p className="mt-1 text-sm text-text-muted">
        Corrige los datos para que la ayuda llegue mejor.
      </p>
      <OfferForm
        mode="edit"
        initial={offer}
        requireCode={offer.isOwner !== true}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        onSubmit={(body) =>
          api
            .updateOffer(id, body as UpdateOffer)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['offer', id] })
              queryClient.invalidateQueries({ queryKey: ['offers'] })
              navigate(`/oferta/${id}`)
            })
        }
        onCancel={() => navigate(`/oferta/${id}`)}
      />
    </div>
  )
}