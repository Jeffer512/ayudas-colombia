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
      <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          {title}
        </h1>
        <p className="mt-2 text-fg-muted">{intro}</p>

        {code !== undefined && (
          <>
            <p
              className="mx-auto mt-4 inline-block rounded-lg bg-surface px-6 py-3 font-mono text-3xl font-bold tracking-widest text-green-800 dark:text-green-300 shadow-sm"
              aria-label="Código de cierre"
            >
              {code}
            </p>
            <p className="mt-3 text-xs text-fg-muted">
              {codeFootnote ?? 'Nadie más podrá ver este código por la aplicación.'}
            </p>
          </>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={detailHref}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            {detailLabel}
          </Link>
          <button
            onClick={onReset}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-fg-muted hover:bg-bg"
          >
            Publicar otro
          </button>
        </div>
      </div>
    </div>
  )
}