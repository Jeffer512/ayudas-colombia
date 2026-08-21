import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { RegisterResult } from '../lib/types'
import Button, { buttonVariants } from '../components/ui/Button'
import Field from '../components/ui/Field'
import { Input } from '../components/ui/Input'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState<RegisterResult | null>(null)
  const [code, setCode] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.register({ name, email, password }),
    onSuccess: (result) => setDone(result),
  })

  const verifyMutation = useMutation({
    mutationFn: () => api.verifyEmail({ code, email }),
    onSuccess: () => setDone({ ...done!, verified: true } as RegisterResult & { verified: boolean }),
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    mutation.mutate()
  }

  function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    verifyMutation.mutate()
  }

  if (done && (done as RegisterResult & { verified?: boolean }).verified) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-lg border border-accent-muted bg-accent-muted p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            Correo verificado
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Tu cuenta está activa. Inicia sesión para continuar.
          </p>
          <div className="mt-6">
            <Link
              to={returnTo ? `/iniciar-sesion?returnTo=${returnTo}` : '/iniciar-sesion'}
              className={buttonVariants({ variant: 'primary' })}
            >
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-lg border border-accent-muted bg-accent-muted p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            Revisa tu correo
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Enviamos un enlace de verificación a <strong>{email}</strong>. Ábrelo
            para activar tu cuenta o usa el código de 6 dígitos que te enviamos.
          </p>

          {done.verificationUrl && (
            <p className="mt-3 break-all rounded-md bg-surface p-2 text-xs text-primary">
              <span className="font-medium">Enlace de desarrollo:</span>{' '}
              {done.verificationUrl}
            </p>
          )}

          <form onSubmit={handleVerify} className="mt-6 space-y-4 text-left">
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
            {verifyMutation.isError && (
              <div
                role="alert"
                className="rounded-lg border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
              >
                <p>{(verifyMutation.error as Error).message}</p>
                {(verifyMutation.error as { code?: string }).code === 'code_locked' && (
                  <Link
                    to={`/verificar-correo${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                    className="mt-2 inline-block font-medium text-primary underline"
                  >
                    Solicitar un nuevo código
                  </Link>
                )}
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? 'Verificando…' : 'Verificar código'}
            </Button>
          </form>

          <div className="mt-6">
            <Link
              to={returnTo ? `/iniciar-sesion?returnTo=${returnTo}` : '/iniciar-sesion'}
              className={buttonVariants({ variant: 'primary' })}
            >
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          Crear cuenta
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Regístrate para participar en la Red de ayudas. Después de
          registrarte tendrás que verificar tu correo.
        </p>

        {mutation.isError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
          >
            {(mutation.error as Error).message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Nombre" htmlFor="name">
            <Input
              id="name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Correo" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Contraseña (mínimo 8 caracteres)" htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Registrando…' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-fg-muted">
          ¿Ya tienes cuenta?{' '}
          <Link
            to={returnTo ? `/iniciar-sesion?returnTo=${returnTo}` : '/iniciar-sesion'}
            className="font-medium text-primary hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}