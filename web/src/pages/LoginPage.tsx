import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import { Input } from '../components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.login({ email, password }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      if (returnTo) {
        navigate(returnTo)
      } else if (data.staff) {
        navigate('/mi-organizacion')
      } else {
        navigate('/')
      }
    },
  })

  const resend = useMutation({
    mutationFn: () => api.resendVerification(email),
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    mutation.mutate()
  }

  const error = mutation.error instanceof ApiError ? mutation.error : null
  const unverified = error?.code === 'email_unverified'
  const pending = error?.code === 'membership_pending'

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Accede a tu organización para gestionar su información y publicar
          pedidos.
        </p>

        {mutation.isError && !unverified && !pending && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
          >
            {error?.message ?? 'No pudimos iniciar sesión'}
          </div>
        )}

        {unverified && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-warning-muted bg-warning-muted p-3 text-sm text-warning"
          >
            <p>
              Tu correo todavía no está verificado. Revisa tu bandeja de entrada
              o{' '}
              <Link to="/verificar-correo" className="font-medium underline">
                reenvía el enlace
              </Link>
              .
            </p>
            {resend.isSuccess && (
              <p className="mt-2 text-accent-hover">
                Correo reenviado. Revisa tu bandeja de entrada.
              </p>
            )}
            {resend.isError && (
              <p className="mt-2 text-danger">
                {(resend.error as Error).message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resend.isPending}
              onClick={() => resend.mutate()}
              className="mt-2"
            >
              {resend.isPending ? 'Enviando…' : 'Reenviar correo'}
            </Button>
          </div>
        )}

        {pending && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-warning-muted bg-warning-muted p-3 text-sm text-warning"
          >
            {error?.message}. Cuando el manager de la organización apruebe tu
            solicitud podrás ingresar.
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
          <Field label="Contraseña" htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-fg-muted">
          ¿No tienes cuenta?{' '}
          <Link
            to={returnTo ? `/registro?returnTo=${returnTo}` : '/registro'}
            className="font-medium text-primary hover:underline"
          >
            Regístrate
          </Link>
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          ¿Olvidaste tu contraseña?{' '}
          <Link to="/recuperar-contrasena" className="font-medium text-primary hover:underline">
            Recupérala
          </Link>
        </p>
      </div>
    </div>
  )
}