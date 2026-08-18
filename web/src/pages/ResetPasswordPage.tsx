import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import Button, { buttonVariants } from '../components/ui/Button'
import Field from '../components/ui/Field'
import { Input } from '../components/ui/Input'

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
        <div className="rounded-lg border border-accent-muted bg-accent-muted p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            Contraseña actualizada
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Ya puedes iniciar sesión con tu contraseña nueva.
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
          Crear contraseña nueva
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Elige una contraseña nueva para tu cuenta. El enlace es válido por 24
          horas.
        </p>

        {!token && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-warning-muted bg-warning-muted p-3 text-sm text-warning"
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
            className="mt-4 rounded-lg border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
          >
            {(mutation.error as Error).message}
          </div>
        )}

        {token && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label="Contraseña nueva"
              htmlFor="password"
              hint="Mínimo 8 caracteres."
            >
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
            <Field
              label="Confirmar contraseña"
              htmlFor="confirm"
              error={mismatch ? 'Las contraseñas no coinciden.' : undefined}
            >
              <Input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={mutation.isPending || mismatch}
            >
              {mutation.isPending ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </form>
        )}

        <p className="mt-4 text-sm text-fg-muted">
          <Link to="/iniciar-sesion" className="font-medium text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}