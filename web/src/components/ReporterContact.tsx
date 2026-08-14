import type { ReactNode } from 'react'
import type { Reporter } from '../lib/types'

function whatsappLink(value: string): string | null {
  const digits = value.replace(/[^\d]/g, '')
  return /^\d{7,15}$/.test(digits) ? `https://wa.me/${digits}` : null
}

interface ReporterContactProps {
  reporter: Reporter
  nameLabel?: string
  name?: ReactNode
}

export default function ReporterContact({
  reporter,
  nameLabel = 'Reporta',
  name,
}: ReporterContactProps) {
  const hasPhone = reporter.phone !== null && reporter.phone !== ''
  const hasEmail = reporter.email !== null && reporter.email !== ''

  return (
    <>
      <div>
        <dt className="font-medium text-slate-500">{nameLabel}</dt>
        <dd className="text-slate-800">{name ?? reporter.name}</dd>
      </div>

      {hasPhone && (
        <div>
          <dt className="font-medium text-slate-500">Teléfono</dt>
          <dd className="text-slate-800">
            <a href={`tel:${reporter.phone}`} className="text-sky-700">
              {reporter.phone}
            </a>
          </dd>
        </div>
      )}

      {reporter.whatsapp && (
        <div>
          <dt className="font-medium text-slate-500">WhatsApp</dt>
          <dd className="text-slate-800">
            {whatsappLink(reporter.whatsapp) ? (
              <a
                href={whatsappLink(reporter.whatsapp)!}
                target="_blank"
                rel="noreferrer"
                className="text-sky-700"
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
                  className="ml-2 text-xs text-sky-700 underline"
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
          <dt className="font-medium text-slate-500">Correo</dt>
          <dd className="text-slate-800">
            <a href={`mailto:${reporter.email}`} className="text-sky-700">
              {reporter.email}
            </a>
          </dd>
        </div>
      )}
    </>
  )
}