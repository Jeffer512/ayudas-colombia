import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { RegisterResult } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-text-muted'

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<'staff' | 'citizen'>('staff')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgId, setOrgId] = useState('')
  const [done, setDone] = useState<RegisterResult | null>(null)

  const orgsQuery = useQuery({
    queryKey: ['help-orgs'],
    queryFn: () => api.helpOrgs(),
    enabled: accountType === 'staff',
  })

  const mutation = useMutation({
    mutationFn: () =>
      api.register({ name, email, password, orgId: orgId || undefined }),
    onSuccess: (result) => setDone(result),
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    mutation.mutate()
  }

  const orgs = orgsQuery.data?.helpOrgs ?? []

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-8">
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            Revisa tu correo
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Enviamos un enlace de verificación a <strong>{email}</strong>. Ábrelo
            para activar tu cuenta y luego inicia sesión.
          </p>
          {accountType === 'staff' && (
            <p className="mt-2 text-xs text-text-muted">
              Si no eres la primera persona de la organización, tu solicitud
              quedará pendiente de aprobación por el manager. Verificar tu correo
              no cambia eso.
            </p>
          )}
          {done.verificationUrl && (
            <p className="mt-3 break-all rounded-md bg-surface p-2 text-xs text-sky-700">
              <span className="font-medium">Enlace de desarrollo:</span>{' '}
              {done.verificationUrl}
            </p>
          )}
          <div className="mt-6">
            <Link
              to="/iniciar-sesion"
              className="inline-block rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
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
      <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
      <p className="mt-1 text-sm text-text-muted">
        Regístrate para participar en la Red de ayudas. Después de
        registrarte tendrás que verificar tu correo.
      </p>

      {mutation.isError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300"
        >
          {(mutation.error as Error).message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <fieldset>
          <legend className={labelClass}>Tipo de cuenta</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                accountType === 'staff'
                  ? 'border-sky-600 bg-sky-50'
                  : 'border-line bg-surface'
              }`}
            >
              <input
                type="radio"
                name="accountType"
                checked={accountType === 'staff'}
                onChange={() => setAccountType('staff')}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-text-main">
                  Personal de organización
                </span>
                <span className="block text-xs text-text-muted">
                  Gestiona una organización y publica pedidos a su nombre.
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                accountType === 'citizen'
                  ? 'border-sky-600 bg-sky-50'
                  : 'border-line bg-surface'
              }`}
            >
              <input
                type="radio"
                name="accountType"
                checked={accountType === 'citizen'}
                onChange={() => setAccountType('citizen')}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-text-main">
                  Cuenta personal
                </span>
                <span className="block text-xs text-text-muted">
                  Para ofrecer y coordinar ayuda como persona. Publicar sigue
                  siendo anónimo.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
        <div>
          <label htmlFor="name" className={labelClass}>
            Nombre
          </label>
          <input
            id="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
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
            Contraseña (mínimo 8 caracteres)
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
        </div>
        {accountType === 'staff' && (
          <div>
            <label htmlFor="orgId" className={labelClass}>
              ¿A qué organización perteneces?
            </label>
            <select
              id="orgId"
              required
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className={`mt-1 ${inputClass}`}
            >
              <option value="">Selecciona una organización…</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-muted">
              Si eres el primero de tu organización, quedarás como manager. Si ya
              tiene personal, tu solicitud quedará{' '}
              <strong>pendiente de aprobación</strong>. ¿No encuentras tu
              organización?{' '}
              <Link to="/nuevo-centro" className="text-sky-700 hover:underline">
                Publícala aquí
              </Link>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={
            mutation.isPending || (accountType === 'staff' && !orgsQuery.data)
          }
          className="w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {mutation.isPending ? 'Registrando…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-4 text-sm text-text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link to="/iniciar-sesion" className="font-medium text-sky-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}