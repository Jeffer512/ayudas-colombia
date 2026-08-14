import { Link } from 'react-router-dom'

interface SuccessScreenProps {
  title: string
  intro: string
  code?: string
  codeFootnote?: string
  detailHref: string
  detailLabel: string
  onReset: () => void
}

export default function SuccessScreen({
  title,
  intro,
  code,
  codeFootnote,
  detailHref,
  detailLabel,
  onReset,
}: SuccessScreenProps) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 text-slate-700">{intro}</p>

        {code !== undefined && (
          <>
            <p
              className="mx-auto mt-4 inline-block rounded-lg bg-white px-6 py-3 font-mono text-3xl font-bold tracking-widest text-green-800 shadow-sm"
              aria-label="Código de cierre"
            >
              {code}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {codeFootnote ?? 'Nadie más podrá ver este código por la aplicación.'}
            </p>
          </>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={detailHref}
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          >
            {detailLabel}
          </Link>
          <button
            onClick={onReset}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Publicar otro
          </button>
        </div>
      </div>
    </div>
  )
}