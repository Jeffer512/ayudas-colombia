import { Link } from 'react-router-dom'
import Button, { buttonVariants } from './ui/Button'

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
      <div className="rounded-lg border border-accent-muted bg-accent-muted p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          {title}
        </h1>
        <p className="mt-2 text-fg-muted">{intro}</p>

        {code !== undefined && (
          <>
            <p
              className="mx-auto mt-4 inline-block rounded-lg bg-surface px-6 py-3 font-mono text-3xl font-bold tracking-widest text-accent-hover shadow-sm"
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
          <Link to={detailHref} className={buttonVariants({ variant: 'primary' })}>
            {detailLabel}
          </Link>
          <Button onClick={onReset} variant="outline">
            Publicar otro
          </Button>
        </div>
      </div>
    </div>
  )
}