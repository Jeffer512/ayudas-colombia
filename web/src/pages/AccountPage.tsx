import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { KeyRound, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import type { UpdateAccountResult } from '../lib/types'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Skeleton, { SkeletonText } from '../components/ui/Skeleton'

export default function AccountPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<UpdateAccountResult | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const hydrated = useRef(false)

  const me = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!hydrated.current && me.data?.authenticated) {
      setName(me.data.name ?? '')
      setEmail(me.data.email ?? '')
      hydrated.current = true
    }
  }, [me.data])

  const authenticated = me.data?.authenticated === true
  const originalEmail = me.data?.email ?? ''

  const update = useMutation({
    mutationFn: () => {
      const body: { name?: string; email?: string; password?: string } = {}
      if (name.trim() !== me.data?.name) body.name = name.trim()
      if (email.trim().toLowerCase() !== originalEmail) {
        body.email = email.trim()
        body.password = password
      }
      return api.updateAccount(body)
    },
    onSuccess: (result) => {
      setLastResult(result)
      setPassword('')
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const remove = useMutation({
    mutationFn: () => api.deleteAccount(deletePassword),
    onSuccess: () => {
      queryClient.setQueryData(['me'], {
        authenticated: false,
        name: null,
        email: null,
        staff: null,
        emailVerified: false,
        pendingOrgId: null,
      })
      navigate('/')
    },
  })

  const passwordChange = useMutation({
    mutationFn: () =>
      api.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
      setPasswordSaved(true)
    },
  })

  function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordSaved(false)
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }
    setPasswordError(null)
    passwordChange.mutate()
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLastResult(null)
    const changed = email.trim().toLowerCase() !== originalEmail
    if (changed && !password) {
      setFormError('Escribe tu contraseña actual para cambiar el correo')
      return
    }
    setFormError(null)
    update.mutate()
  }

  if (me.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
          <SkeletonText lines={4} />
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
          <SkeletonText lines={3} />
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/iniciar-sesion?returnTo=/cuenta" replace />
  }

  const emailChanged = email.trim().toLowerCase() !== originalEmail

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
        Mi cuenta
      </h1>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-lg font-bold text-fg">Perfil</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Actualiza tus datos de acceso a la plataforma.
        </p>

        {me.data?.emailVerified === false && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-warning-muted bg-warning-muted p-3 text-sm text-warning"
          >
            Tu correo actual todavía no está verificado. Revisa tu bandeja de
            entrada (o el spam) para activarlo y poder iniciar sesión nuevamente.
          </div>
        )}

        {lastResult?.emailChanged && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-accent-muted bg-accent-muted p-3 text-sm text-accent-hover"
          >
            <p className="font-medium">
              Guardamos tu cuenta. Revisa tu correo: enviamos un enlace de
              verificación a <strong>{lastResult.email}</strong>.
            </p>
            {lastResult.verificationUrl && (
              <p className="mt-2 break-all rounded-md bg-surface p-2 text-xs text-primary">
                <span className="font-medium">Enlace de desarrollo:</span>{' '}
                {lastResult.verificationUrl}
              </p>
            )}
          </div>
        )}

        {lastResult && !lastResult.emailChanged && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-accent-muted bg-accent-muted p-3 text-sm text-accent-hover"
          >
            Cambios guardados.
          </div>
        )}

        {(formError || update.isError) && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
          >
            {formError ?? (update.error as Error).message}
          </div>
        )}

        <form onSubmit={handleSubmit} aria-label="Actualizar perfil" className="mt-6 space-y-4">
          <Field label="Nombre" htmlFor="name">
            <Input
              id="name"
              required
              minLength={2}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Correo" htmlFor="email" hint="Si cambias el correo, tendrás que verificarlo.">
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {emailChanged && (
            <Field label="Contraseña actual" htmlFor="currentPassword">
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-required="true"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}

          <Button type="submit" size="lg" disabled={update.isPending}>
            {update.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-fg">
          <KeyRound size={20} aria-hidden="true" />
          Cambiar contraseña
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Usa una contraseña de al menos 8 caracteres y diferente a la actual.
        </p>

        {passwordSaved && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-accent-muted bg-accent-muted p-3 text-sm text-accent-hover"
          >
            Contraseña actualizada.
          </div>
        )}

        {(passwordError || passwordChange.isError) && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
          >
            {passwordError ?? (passwordChange.error as Error).message}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} aria-label="Cambiar contraseña" className="mt-6 space-y-4">
          <Field label="Contraseña actual" htmlFor="currentPasswordChange">
            <Input
              id="currentPasswordChange"
              type="password"
              required
              minLength={1}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="Nueva contraseña (mínimo 8 caracteres)" htmlFor="newPassword">
            <Input
              id="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Repetir nueva contraseña" htmlFor="newPasswordConfirm">
            <Input
              id="newPasswordConfirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
            />
          </Field>

          <Button type="submit" size="lg" disabled={passwordChange.isPending}>
            {passwordChange.isPending ? 'Actualizando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </div>

      <div className="rounded-lg border border-danger-muted bg-surface p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-danger">
          Zona de peligro
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Al eliminar tu cuenta se borran también los pedidos, ofertas y avisos
          que publicaste. Esta acción no se puede deshacer.
        </p>
        <Button
          variant="danger"
          size="lg"
          className="mt-4"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 size={18} aria-hidden="true" />
          Eliminar cuenta
        </Button>
      </div>

      {deleteOpen && (
        <Modal title="¿Eliminar tu cuenta?" onClose={() => setDeleteOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-fg">
              Se eliminará tu cuenta y todo el contenido que publicaste (pedidos,
              ofertas, avisos y reportes). Esta acción no se puede deshacer.
            </p>

            {remove.isError && (
              <div
                role="alert"
                className="rounded-lg border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
              >
                {(remove.error as Error).message}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                remove.mutate()
              }}
              aria-label="Confirmar eliminación de cuenta"
              className="space-y-4"
            >
              <Field label="Contraseña actual" htmlFor="deletePassword">
                <Input
                  id="deletePassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </Field>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  size="md"
                  className="sm:order-1"
                  onClick={() => setDeleteOpen(false)}
                  disabled={remove.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  className="sm:order-2"
                  disabled={remove.isPending}
                >
                  {remove.isPending ? 'Eliminando…' : 'Eliminar mi cuenta'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  )
}