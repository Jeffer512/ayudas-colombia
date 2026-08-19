import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import Skeleton from '../components/ui/Skeleton'
import { buttonVariants } from '../components/ui/Button'
import type { AnalyticsResponse } from '../lib/types'

const TOKEN_KEY = 'ayudas_admin_token'

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-fg-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-fg">{value}</p>
    </div>
  )
}

export default function AdminPage() {
  const [token, setToken] = useState(() => {
    try {
      return window.sessionStorage.getItem(TOKEN_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [draft, setDraft] = useState('')

  const query = useQuery<AnalyticsResponse>({
    queryKey: ['admin-analytics', token],
    queryFn: () => api.adminAnalytics(token),
    enabled: token.length > 0,
    retry: false,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = draft.trim()
    if (!value) return
    setToken(value)
    try {
      window.sessionStorage.setItem(TOKEN_KEY, value)
    } catch {
      /* almacenamiento no disponible */
    }
  }

  const logout = () => {
    setToken('')
    setDraft('')
    try {
      window.sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      /* almacenamiento no disponible */
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          Panel de estadísticas
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Ingresa el token de administración para ver las visitas registradas.
        </p>
        <form
          onSubmit={submit}
          className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-fg">
            Token de administración
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg focus:border-primary focus:outline-none"
            />
          </label>
          <button type="submit" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            Ver estadísticas
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            Visitantes únicos
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Personas que cargaron la aplicación, contadas una vez por día.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          Cerrar sesión
        </button>
      </div>

      {query.isPending && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {query.isError && (
        <div className="mt-6 rounded-lg border border-danger-muted bg-danger-muted p-4 text-center">
          <p className="font-medium text-danger">
            No pudimos cargar las estadísticas. Revisa el token e inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 rounded-md bg-danger px-4 py-2 text-sm font-medium text-on-danger hover:bg-danger-hover"
          >
            Cambiar token
          </button>
        </div>
      )}

      {query.data && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard label="Hoy" value={query.data.today} />
            <StatCard label="Últimos 7 días" value={query.data.last7} />
            <StatCard label="Últimos 30 días" value={query.data.last30} />
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface">
            <h2 className="border-b border-border px-4 py-3 font-display text-lg font-bold text-fg">
              Por día
            </h2>
            {query.data.daily.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-fg-muted">
                Todavía no hay visitas registradas.
              </p>
            ) : (
              <ul>
                {[...query.data.daily].reverse().map((day) => (
                  <li
                    key={day.date}
                    className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm last:border-b-0"
                  >
                    <span className="text-fg">{formatDay(day.date)}</span>
                    <span className="font-semibold text-fg">{day.visitors}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}