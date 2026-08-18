import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

const labelClass = 'text-sm font-medium text-fg-muted'

type Stage = 'idle' | 'verifying' | 'verified' | 'invalid'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [stage, setStage] = useState<Stage>('idle')
  const [email, setEmail] = useState('')
  const [resendSent, setResendSent] = useState(false)

  const verify = useMutation({
    mutationFn: () => api.verifyEmail(token),
    onSuccess: () => setStage('verified'),
    onError: () => setStage('invalid'),
  })

  const resend = useMutation({
    mutationFn: () => api.resendVerification(email),
    onSuccess: () => setResendSent(true),
  })

  useEffect(() => {
    if (!token) return
    setStage('verifying')
    verify.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function handleResend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResendSent(false)
    resend.mutate()
  }

  if (stage === 'verifying') {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight">Verificando tu correo…</h1>
        <p className="mt-2 text-sm text-fg-muted" role="status">
          Estamos activando tu cuenta.
        </p>
      </div>
    )
  }

  if (stage === 'verified') {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-8">
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            Correo verificado
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Tu cuenta está activa. Si tu vinculación a una organización estaba
            pendiente, podrás ingresar cuando el manager la apruebe.
          </p>
          <Link
            to="/iniciar-sesion"
            className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">Verificar tu correo</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Escribe el correo con el que te registraste para recibir un nuevo enlace
        de verificación.
      </p>

      {stage === 'invalid' && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-warning-muted  bg-warning-muted  p-3 text-sm text-warning "
        >
          El enlace no es válido o ya expiró (tiene validez de 24 horas).
          Solicita uno nuevo abajo.
        </div>
      )}

      {resendSent && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-3 text-sm text-green-700 dark:text-green-300"
        >
          Correo reenviado. Revisa tu bandeja de entrada (y la carpeta de spam).
        </div>
      )}

      {resend.isError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger-muted  bg-danger-muted  p-3 text-sm text-danger "
        >
          {(resend.error as Error).message}
        </div>
      )}

      <form onSubmit={handleResend} className="mt-6 space-y-4">
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
          disabled={resend.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {resend.isPending ? 'Enviando…' : 'Reenviar enlace'}
        </button>
      </form>

      <p className="mt-4 text-sm text-fg-muted">
        ¿Ya verificaste tu correo?{' '}
        <Link to="/iniciar-sesion" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}