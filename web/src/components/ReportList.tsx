import type { Report } from '../lib/types'
import ReportCard from './ReportCard'

export default function ReportList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        <p className="font-medium">No hay reportes con estos filtros</p>
        <p className="mt-1 text-sm">
          Prueba limpiando los filtros o busca en otra zona de la ciudad.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((report) => (
        <li key={report.id}>
          <ReportCard report={report} />
        </li>
      ))}
    </ul>
  )
}