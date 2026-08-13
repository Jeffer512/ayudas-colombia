import { Link } from 'react-router-dom'
import { ACOPIO_TYPE_LABELS } from '../lib/constants'
import { formatDate } from '../lib/format'
import type { AcopioCenter } from '../lib/types'
import AcopioStatusBadge from './AcopioStatusBadge'

export default function AcopioCard({
  acopio,
}: {
  acopio: AcopioCenter
}) {
  return (
    <Link
      to={`/centro/${acopio.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-400 hover:shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <AcopioStatusBadge status={acopio.status} />
        <span className="text-xs text-slate-500">
          {ACOPIO_TYPE_LABELS[acopio.type] ?? acopio.type} · {acopio.city.name}
        </span>
      </div>

      <h2 className="mt-2 font-semibold text-slate-900">{acopio.name}</h2>
      {acopio.description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
          {acopio.description}
        </p>
      )}

      <div className="mt-2 text-xs text-slate-500">
        {acopio.address ? `${acopio.address} · ` : null}
        {acopio.hours ? `Horario: ${acopio.hours} · ` : null}
        Publicado {formatDate(acopio.createdAt)}
      </div>
    </Link>
  )
}