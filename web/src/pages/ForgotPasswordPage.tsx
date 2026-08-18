import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

const labelClass = 'text-sm font-medium text-fg-muted'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.forgotPassword(email),
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    mutation.mutate()
  }

  if (mutation.isSuccess) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-8">
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            Revisa tu correo
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Si existe una cuenta con ese correo, te enviamos un enlace para
            restablecer tu contraseña. Revisa la bandeja de entrada (y el spam).
          </p>
          <Link
            to="/iniciar-sesion"
            className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">
        Recuperar contraseña
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        Escribe el correo de tu cuenta y te enviaremos un enlace para crear una
        contraseña nueva.
      </p>

      {mutation.isError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger-muted  bg-danger-muted  p-3 text-sm text-danger "
        >
          {(mutation.error as Error).message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className={labelClass}>
            Correo
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {mutation.isPending ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>

      <p className="mt-4 text-sm text-fg-muted">
        ¿Recordaste tu contraseña?{' '}
        <Link to="/iniciar-sesion" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}