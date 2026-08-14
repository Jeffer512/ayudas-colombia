import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api/client'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-slate-700'

export default function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.login({ email, password }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      if (data.staff) navigate('/mi-organizacion')
      else navigate('/')
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
      <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-slate-600">
        Accede a tu organización para gestionar su información y publicar
        pedidos.
      </p>

      {mutation.isError && !unverified && !pending && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error?.message ?? 'No pudimos iniciar sesión'}
        </div>
      )}

      {unverified && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          <p>
            Tu correo todavía no está verificado. Revisa tu bandeja de entrada
            o{' '}
            <Link
              to="/verificar-correo"
              className="font-medium text-amber-900 underline"
            >
              reenvía el enlace
            </Link>
            .
          </p>
          {resend.isSuccess && (
            <p className="mt-2 text-emerald-700">
              Correo reenviado. Revisa tu bandeja de entrada.
            </p>
          )}
          {resend.isError && (
            <p className="mt-2 text-red-700">
              {(resend.error as Error).message}
            </p>
          )}
          <button
            type="button"
            disabled={resend.isPending}
            onClick={() => resend.mutate()}
            className="mt-2 rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            {resend.isPending ? 'Enviando…' : 'Reenviar correo'}
          </button>
        </div>
      )}

      {pending && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          {error?.message}. Cuando el manager de la organización apruebe tu
          solicitud podrás ingresar.
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
        <div>
          <label htmlFor="password" className={labelClass}>
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {mutation.isPending ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-medium text-sky-700 hover:underline">
          Regístrate
        </Link>
      </p>
      <p className="mt-2 text-sm text-slate-600">
        ¿Olvidaste tu contraseña?{' '}
        <Link to="/recuperar-contrasena" className="font-medium text-sky-700 hover:underline">
          Recupérala
        </Link>
      </p>
    </div>
  )
}