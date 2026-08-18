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

  const mutation = useMutation({
    mutationFn: () => api.register({ name, email, password }),
    onSuccess: (result) => setDone(result),
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    mutation.mutate()
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
            para activar tu cuenta y luego inicia sesión.
          </p>
          {done.verificationUrl && (
            <p className="mt-3 break-all rounded-md bg-surface p-2 text-xs text-primary">
              <span className="font-medium">Enlace de desarrollo:</span>{' '}
              {done.verificationUrl}
            </p>
          )}
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