import { Link } from 'react-router-dom'
import { REPORT_TYPE_LABELS, URGENCY_META } from '../lib/constants'
import { formatDate } from '../lib/format'
import type { Report } from '../lib/types'
import StatusBadge from './StatusBadge'

export default function ReportCard({ report }: { report: Report }) {
  const typeLabel = REPORT_TYPE_LABELS[report.type] ?? report.type
  const urgency = URGENCY_META[report.urgency] ?? {
    label: report.urgency,
    color: '#64748b',
  }

  return (
    <Link
      to={`/reporte/${report.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-400 hover:shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={report.status} />
        <span className="text-xs text-slate-500">
          {typeLabel} · {report.city.name}
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium"
          style={{ color: urgency.color }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: urgency.color }}
          />
          Urgencia {urgency.label}
        </span>
      </div>

      <h2 className="mt-2 font-semibold text-slate-900">{report.title}</h2>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
        {report.description}
      </p>

      <div className="mt-2 text-xs text-slate-500">
        {report.address ? `${report.address} · ` : null}
        {formatDate(report.createdAt)}
      </div>
    </Link>
  )
}