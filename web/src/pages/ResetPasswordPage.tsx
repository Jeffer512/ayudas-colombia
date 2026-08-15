import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

const inputClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-text-muted'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.resetPassword(token, password),
  })

  const mismatch = confirm !== password

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (mismatch) return
    mutation.mutate()
  }

  if (mutation.isSuccess) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-8">
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            Contraseña actualizada
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Ya puedes iniciar sesión con tu contraseña nueva.
          </p>
          <Link
            to="/iniciar-sesion"
            className="mt-6 inline-block rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">
        Crear contraseña nueva
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        Elige una contraseña nueva para tu cuenta. El enlace es válido por 24
        horas.
      </p>

      {!token && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-300"
        >
          Falta el enlace de restablecimiento.{' '}
          <Link to="/recuperar-contrasena" className="font-medium underline">
            Solicita uno nuevo
          </Link>
          .
        </div>
      )}

      {mutation.isError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300"
        >
          {(mutation.error as Error).message}
        </div>
      )}

      {token && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className={labelClass}>
              Contraseña nueva
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-text-muted">
              Mínimo 8 caracteres.
            </p>
          </div>
          <div>
            <label htmlFor="confirm" className={labelClass}>
              Confirmar contraseña
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>

          {mismatch && (
            <div
              role="alert"
              className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-300"
            >
              Las contraseñas no coinciden.
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending || mismatch}
            className="w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
          >
            {mutation.isPending ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      )}

      <p className="mt-4 text-sm text-text-muted">
        <Link to="/iniciar-sesion" className="font-medium text-sky-700 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  )
}