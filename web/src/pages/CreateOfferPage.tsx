import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import OfferForm from '../components/OfferForm'
import SuccessScreen from '../components/SuccessScreen'
import type { CreatedOffer, NewOffer } from '../lib/types'

export default function CreateOfferPage() {
  const navigate = useNavigate()
  const [created, setCreated] = useState<CreatedOffer | null>(null)

  if (created) {
    return (
      <SuccessScreen
        title="Oferta publicada"
        intro="Tu oferta ya aparece en el mapa y en la lista. Cuando ya no esté disponible, ciérrala con tu código:"
        code={created.resolveCode}
        codeFootnote="Es la única manera de cerrar la oferta, para que otros no te busquen en vano."
        detailHref={`/oferta/${created.id}`}
        detailLabel="Ver oferta"
        onReset={() => setCreated(null)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Ofrecer ayuda</h1>
      <p className="mt-1 text-sm text-text-muted">
        Diles a los demás qué puedes ofrecer. Cuando alguien se contacte y ya
        no esté disponible, ciérralo con tu código desde la oferta.
      </p>
      <OfferForm
        mode="create"
        submitLabel="Publicar oferta"
        submittingLabel="Publicando…"
        onSubmit={(body) => api.createOffer(body as NewOffer).then(setCreated)}
        onCancel={() => navigate('/')}
      />
    </div>
  )
}