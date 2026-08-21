import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import Button, { buttonVariants } from '../components/ui/Button'
import Field from '../components/ui/Field'
import { Input } from '../components/ui/Input'

type Stage = 'idle' | 'verifying' | 'verified' | 'invalid'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [stage, setStage] = useState<Stage>('idle')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [code, setCode] = useState('')
  const [resendSent, setResendSent] = useState(false)

  const verify = useMutation({
    mutationFn: () => api.verifyEmail({ token }),
    onSuccess: () => setStage('verified'),
    onError: () => setStage('invalid'),
  })

  const verifyCode = useMutation({
    mutationFn: () => api.verifyEmail({ code, email }),
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

  function handleVerifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    verifyCode.mutate()
  }

  if (stage === 'verifying') {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          Verificando tu correo…
        </h1>
        <p className="mt-2 text-sm text-fg-muted" role="status">
          Estamos activando tu cuenta.
        </p>
      </div>
    )
  }

  if (stage === 'verified') {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-lg border border-accent-muted bg-accent-muted p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            Correo verificado
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Tu cuenta está activa. Si tu vinculación a una organización estaba
            pendiente, podrás ingresar cuando el manager la apruebe.
          </p>
          <Link
            to="/iniciar-sesion"
            className={`${buttonVariants({ variant: 'primary' })} mt-6`}
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          Verificar tu correo
        </h1>

        {!resendSent ? (
          <>
            <p className="mt-1 text-sm text-fg-muted">
              Solicita un nuevo enlace de verificación escribiendo el correo con
              el que te registraste.
            </p>

            {stage === 'invalid' && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-warning-muted bg-warning-muted p-3 text-sm text-warning"
              >
                El enlace no es válido o ya expiró (tiene validez de 24 horas).
                Solicita uno nuevo abajo.
              </div>
            )}

            <form onSubmit={handleResend} className="mt-6 space-y-4">
              <Field label="Correo" htmlFor="resend-email">
                <Input
                  id="resend-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              {resend.isError && (
                <div
                  role="alert"
                  className="rounded-lg border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
                >
                  {(resend.error as Error).message}
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={resend.isPending}
              >
                {resend.isPending ? 'Enviando…' : 'Reenviar enlace'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-fg-muted">
              Enviamos un enlace de verificación a <strong>{email}</strong>.
              Ábrelo para activar tu cuenta o usa el código de 6 dígitos que te
              enviamos.
            </p>

            <div
              role="alert"
              className="mt-4 rounded-lg border border-accent-muted bg-accent-muted p-3 text-sm text-accent-hover"
            >
              Correo reenviado. Revisa tu bandeja de entrada (y la carpeta de spam).
            </div>

            <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
              <Field label="Correo" htmlFor="code-email">
                <Input
                  id="code-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Código de verificación" htmlFor="code">
                <Input
                  id="code"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </Field>
              {verifyCode.isError && (
                <div
                  role="alert"
                  className="rounded-lg border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
                >
                  <p>{(verifyCode.error as Error).message}</p>
                  {(verifyCode.error as { code?: string }).code === 'code_locked' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCode('')
                        setResendSent(false)
                      }}
                      className="mt-2 font-medium text-primary underline"
                    >
                      Solicitar un nuevo código
                    </button>
                  )}
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={verifyCode.isPending}
              >
                {verifyCode.isPending ? 'Verificando…' : 'Verificar código'}
              </Button>
            </form>
          </>
        )}

        <p className="mt-4 text-sm text-fg-muted">
          ¿Ya verificaste tu correo?{' '}
          <Link to="/iniciar-sesion" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
