import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import Button from './ui/Button'
import { TRANSPORT_LABELS, TRANSPORT_OPTIONS } from '../lib/constants'
import type { NewHelpRequest, Request, TransportOption } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

interface HelpRequestFormProps {
  request: Request
  className?: string
  onSuccess?: () => void
  defaultOpen?: boolean
}

export default function HelpRequestForm({
  request,
  className = '',
  onSuccess,
  defaultOpen = false,
}: HelpRequestFormProps) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(defaultOpen)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [transport, setTransport] = useState<TransportOption | ''>('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [iHelped, setIHelped] = useState(false)

  const isSupplies = request.type === 'supplies_request'
  const requesterPicksUp = isSupplies && request.transport === 'can_transport'
  const asksTransport = isSupplies && !requesterPicksUp
  const helpedByLinkedOffer = request.linkedOfferPresent === true
  const helped = iHelped || helpedByLinkedOffer

  const mutation = useMutation({
    mutationFn: (body: NewHelpRequest) => api.helpRequest(request.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', request.id] })
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      setFormOpen(false)
      setName('')
      setNote('')
      setTransport('')
      setPhone('')
      setWhatsapp('')
      setIHelped(true)
      onSuccess?.()
    },
  })

  function submit() {
    const trimmedPhone = phone.trim()
    const trimmedWhatsapp = whatsapp.trim()
    setError(null)
    if (asksTransport && !transport) {
      setError('Indica si puedes transportar los suministros')
      return
    }
    if (
      (requesterPicksUp || transport === 'needs_transport') &&
      !trimmedPhone &&
      !trimmedWhatsapp
    ) {
      setError(
        requesterPicksUp
          ? 'Deja tu teléfono o WhatsApp para coordinar la recogida'
          : 'Deja tu teléfono o WhatsApp para coordinar la entrega',
      )
      return
    }
    if (transport === 'needs_transport' && !name.trim()) {
      setError('Escribe tu nombre para coordinar la entrega')
      return
    }
    mutation.mutate({
      markerId: api.markerId(),
      name: name.trim() || undefined,
      note: note.trim() || undefined,
      ...(asksTransport && transport ? { transport } : {}),
      ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      ...(trimmedWhatsapp ? { whatsapp: trimmedWhatsapp } : {}),
    })
  }

  return (
    <div className={className}>
      <p className="text-sm text-fg-muted">
        {request.isOwner
          ? 'Tú creaste este pedido. Los demás pueden registrarse aquí para ayudarte.'
          : helped
            ? 'Gracias por ayudar. Tu apoyo a este pedido ya quedó registrado.'
            : !isSupplies
              ? 'Registra que puedes ayudar para que los demás coordinen sus esfuerzos.'
              : requesterPicksUp
                ? 'Si puedes ayudar, registra tu apoyo y deja un contacto para coordinar la recogida.'
                : 'Si puedes ayudar, indica si puedes llevar los suministros hasta donde se necesitan.'}
      </p>

      {(error || mutation.isError) && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
        >
          {error ?? (mutation.error as Error).message}
        </div>
      )}

      {request.isOwner ? null : helped ? (
        <p className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent">
          Ya estás ayudando en este pedido
        </p>
      ) : !formOpen ? (
        <Button
          onClick={() => {
            setError(null)
            setFormOpen(true)
          }}
          className="mt-3"
        >
          Voy a ayudar
        </Button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="mt-3 space-y-3"
        >
          <div>
            <label htmlFor="helperName" className="text-sm font-medium text-fg-muted">
              Tu nombre {transport === 'needs_transport' ? '' : '(opcional)'}
            </label>
            <input
              id="helperName"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="helperNote" className="text-sm font-medium text-fg-muted">
              ¿Qué vas a aportar? (opcional)
            </label>
            <input
              id="helperNote"
              placeholder="Ej: llevo agua y una carpa"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>

          {asksTransport && (
            <div>
              <label
                htmlFor="helperTransport"
                className="text-sm font-medium text-fg-muted"
              >
                ¿Puedes transportar los suministros?
              </label>
              <select
                id="helperTransport"
                value={transport}
                onChange={(e) => setTransport(e.target.value as TransportOption)}
                className={`mt-1 ${inputClass}`}
              >
                <option value="">Selecciona una opción…</option>
                {TRANSPORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {TRANSPORT_LABELS[option]}
                  </option>
                ))}
              </select>
              {transport === 'can_transport' && (
                <p className="mt-1 text-xs text-fg-muted">
                  Llévalos hasta donde los necesitan; no hace falta dejar contacto.
                </p>
              )}
              {transport === 'needs_transport' && (
                <p className="mt-1 text-xs text-fg-muted">
                  Publicaremos una carga en el centro de carga para que alguien lleve
                  los suministros hasta el pedido.
                </p>
              )}
            </div>
          )}

          {(requesterPicksUp || transport === 'needs_transport') && (
            <>
              <div>
                <label htmlFor="helperPhone" className="text-sm font-medium text-fg-muted">
                  Teléfono
                </label>
                <input
                  id="helperPhone"
                  inputMode="tel"
                  placeholder="Ej: 311 555 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div>
                <label
                  htmlFor="helperWhatsapp"
                  className="text-sm font-medium text-fg-muted"
                >
                  WhatsApp
                </label>
                <input
                  id="helperWhatsapp"
                  placeholder="Ej: 311 555 0000 o @tu.usuario"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <p className="text-xs text-fg-muted">
                {requesterPicksUp
                  ? 'Deja al menos un contacto para coordinar la recogida.'
                  : 'Deja al menos un contacto para coordinar la entrega de los suministros.'}
              </p>
            </>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              Confirmar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setFormOpen(false)
                setError(null)
              }}
              variant="outline"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}