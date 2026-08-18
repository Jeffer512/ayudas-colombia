import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import Button, { buttonVariants } from '../components/ui/Button'
import Field from '../components/ui/Field'
import { Input } from '../components/ui/Input'

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
        <div className="rounded-lg border border-accent-muted bg-accent-muted p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            Revisa tu correo
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Si existe una cuenta con ese correo, te enviamos un enlace para
            restablecer tu contraseña. Revisa la bandeja de entrada (y el spam).
          </p>
          <Link
            to="/iniciar-sesion"
            className={`${buttonVariants({ variant: 'primary' })} mt-6`}
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          Recuperar contraseña
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Escribe el correo de tu cuenta y te enviaremos un enlace para crear una
          contraseña nueva.
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
          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-fg-muted">
          ¿Recordaste tu contraseña?{' '}
          <Link to="/iniciar-sesion" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}