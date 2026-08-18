import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Reporter } from '../lib/types'

function whatsappLink(value: string): string | null {
  const digits = value.replace(/[^\d]/g, '')
  return /^\d{7,15}$/.test(digits) ? `https://wa.me/${digits}` : null
}

interface ReporterContactProps {
  reporter: Reporter
  nameLabel?: string
  name?: ReactNode
  restricted?: boolean
}

export default function ReporterContact({
  reporter,
  nameLabel = 'Reporta',
  name,
  restricted = false,
}: ReporterContactProps) {
  const hasPhone = reporter.phone !== null && reporter.phone !== ''
  const hasEmail = reporter.email !== null && reporter.email !== ''

  return (
    <>
      <div>
        <dt className="font-medium text-fg-muted">{nameLabel}</dt>
        <dd className="text-fg">{name ?? reporter.name}</dd>
      </div>

      {restricted ? (
        <div className="rounded-md border border-border bg-bg p-3">
          <dt className="font-medium text-fg-muted">Contacto</dt>
          <dd className="mt-1 text-sm text-fg-muted">
            Quien publicó ocultó su contacto. Inicia sesión para verlo.
          </dd>
          <Link
            to="/iniciar-sesion"
            className="mt-1 inline-block text-sm font-medium text-primary underline"
          >
            Iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          {hasPhone && (
            <div>
              <dt className="font-medium text-fg-muted">Teléfono</dt>
              <dd className="text-fg">
                <a href={`tel:${reporter.phone}`} className="text-primary">
                  {reporter.phone}
                </a>
              </dd>
            </div>
          )}

          {reporter.whatsapp && (
            <div>
              <dt className="font-medium text-fg-muted">WhatsApp</dt>
              <dd className="text-fg">
                {whatsappLink(reporter.whatsapp) ? (
                  <a
                    href={whatsappLink(reporter.whatsapp)!}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary"
                  >
                    {reporter.whatsapp}
                  </a>
                ) : (
                  <>
                    <span>{reporter.whatsapp}</span>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard?.writeText(reporter.whatsapp ?? '')
                      }
                      className="ml-2 text-xs text-primary underline"
                    >
                      copiar
                    </button>
                  </>
                )}
              </dd>
            </div>
          )}

          {hasEmail && (
            <div>
              <dt className="font-medium text-fg-muted">Correo</dt>
              <dd className="text-fg">
                <a href={`mailto:${reporter.email}`} className="text-primary">
                  {reporter.email}
                </a>
              </dd>
            </div>
          )}
        </>
      )}
    </>
  )
}