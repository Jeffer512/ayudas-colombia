import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import RequestForm from '../components/RequestForm'
import SuccessScreen from '../components/SuccessScreen'
import type { CreatedRequest, NewRequest } from '../lib/types'

export default function CreateRequestPage() {
  const navigate = useNavigate()
  const [created, setCreated] = useState<CreatedRequest | null>(null)
  const meQuery = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false })
  const isAuthenticated = meQuery.data?.authenticated === true

  if (created) {
    return (
      <SuccessScreen
        title="Pedido publicado"
        intro={
          isAuthenticated
            ? 'Tu pedido ya aparece en el mapa y en la lista. Cuando la situación termine podrás cerrarlo desde tu cuenta; o guarda este código para cerrarlo sin iniciar sesión o dárselo a alguien de confianza:'
            : 'Tu pedido ya aparece en el mapa y en la lista. Guarda tu código para cerrarlo cuando la situación termine:'
        }
        code={created.resolveCode}
        codeFootnote={
          isAuthenticated
            ? 'Con tu cuenta no necesitas el código; con él lo puede cerrar cualquier persona a quien se lo des.'
            : 'Con él se marca tu pedido como resuelto.'
        }
        detailHref={`/pedido/${created.id}`}
        detailLabel="Ver pedido"
        onReset={() => setCreated(null)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Pedir ayuda</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Cuéntanos qué necesitas. Así, vecinos, organizaciones y centros de
        acopio lo verán en el mapa y podrán coordinar la ayuda hacia tu zona.
      </p>
      <RequestForm
        mode="create"
        submitLabel="Publicar pedido"
        submittingLabel="Publicando…"
        onSubmit={(body) => api.createRequest(body as NewRequest).then(setCreated)}
        onCancel={() => navigate('/')}
      />
    </div>
  )
}