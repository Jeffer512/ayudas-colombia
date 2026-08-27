import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { formatItemQuantity } from '../lib/format'
import { defaultCity } from '../lib/geo'
import { isValidPhone } from '../lib/phone'
import RequestCard from '../components/RequestCard'
import Button from '../components/ui/Button'
import {
  HELP_ORG_CATEGORY_LABELS,
  HELP_ORG_ITEM_KIND_LABELS,
  REQUEST_TYPE_LABELS,
  URGENCY_META,
} from '../lib/constants'
import type {
  HelpOrg,
  HelpOrgCategory,
  HelpOrgItem,
  HelpOrgItemKind,
  HelpOrgStatus,
  RequestType,
  UpdateOrgProfile,
  Urgency,
} from '../lib/types'

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary'

const labelClass = 'text-sm font-medium text-fg-muted'

interface ProfileDraft {
  name: string
  category: HelpOrgCategory
  description: string
  address: string
  contactName: string
  contactPhone: string
  hours: string
  accepts: string
}

function profileDraftFrom(org: HelpOrg): ProfileDraft {
  return {
    name: org.name,
    category: org.category,
    description: org.description ?? '',
    address: org.address ?? '',
    contactName: org.contactName ?? '',
    contactPhone: org.contactPhone ?? '',
    hours: org.hours ?? '',
    accepts: org.accepts ?? '',
  }
}

export default function MyOrgPage() {
  const queryClient = useQueryClient()

  const meQuery = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false })
  const staff = meQuery.data?.staff
  const pendingOrgId = meQuery.data?.pendingOrgId ?? null

  const orgsQuery = useQuery({
    queryKey: ['help-orgs'],
    queryFn: () => api.helpOrgs(),
    enabled: meQuery.data?.authenticated === true && !staff,
  })
  const [joinOrgId, setJoinOrgId] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)

  const joinMutation = useMutation({
    mutationFn: () => api.joinOrg(joinOrgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setJoinError(null)
    },
    onError: (err: Error) => setJoinError(err.message),
  })

  const orgQuery = useQuery({
    queryKey: ['help-org', staff?.orgId],
    queryFn: () => api.helpOrg(staff!.orgId),
    enabled: !!staff,
  })
  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: api.cities })
  const cities = citiesQuery.data?.cities ?? []
  const membersQuery = useQuery({
    queryKey: ['members', staff?.orgId],
    queryFn: () => api.orgMembers(staff!.orgId),
    enabled: !!staff,
  })
  const requestsQuery = useQuery({
    queryKey: ['requests', { org: staff?.orgId }],
    queryFn: () => api.requests({ org: staff!.orgId }),
    enabled: !!staff,
  })

  const [memberError, setMemberError] = useState<string | null>(null)

  const approveMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.approveOrgMember(staff!.orgId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', staff?.orgId] })
    },
    onError: (err: Error) => setMemberError(err.message),
  })

  const rejectMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.rejectOrgMember(staff!.orgId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', staff?.orgId] })
    },
    onError: (err: Error) => setMemberError(err.message),
  })

  const [confirmingAction, setConfirmingAction] = useState<HelpOrgStatus | null>(null)

  const toggleStatusMutation = useMutation({
    mutationFn: (status: HelpOrgStatus) =>
      api.updateHelpOrgStatus(staff!.orgId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-org', staff?.orgId] })
      setConfirmingAction(null)
    },
    onError: () => setConfirmingAction(null),
  })

  const [profile, setProfile] = useState<ProfileDraft | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      api.updateHelpOrg(staff!.orgId, {
        name: profile!.name,
        category: profile!.category,
        description: profile!.description.trim() || null,
        address: profile!.address.trim() || null,
        contactName: profile!.contactName.trim() || null,
        contactPhone: profile!.contactPhone.trim() || null,
        hours: profile!.hours.trim() || null,
        accepts: profile!.accepts.trim() || null,
      } satisfies UpdateOrgProfile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-org', staff?.orgId] })
      queryClient.invalidateQueries({ queryKey: ['help-orgs'] })
      setProfile(null)
      setProfileError(null)
    },
    onError: (err: Error) => setProfileError(err.message),
  })

  const [reqType, setReqType] = useState<RequestType>('supplies_request')
  const [reqUrgency, setReqUrgency] = useState<Urgency>('medium')
  const [reqTitle, setReqTitle] = useState('')
  const [reqDescription, setReqDescription] = useState('')
  const [reqAddress, setReqAddress] = useState('')
  const [reqError, setReqError] = useState<string | null>(null)

  const requestMutation = useMutation({
    mutationFn: () =>
      api.createOrgRequest(staff!.orgId, {
        type: reqType,
        urgency: reqUrgency,
        title: reqTitle,
        description: reqDescription,
        address: reqAddress || undefined,
        cityCode: orgQuery.data?.city.code ?? defaultCity(cities)?.code ?? 'pereira',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      setReqTitle('')
      setReqDescription('')
      setReqAddress('')
      setReqError(null)
    },
    onError: (err: Error) => setReqError(err.message),
  })

  const itemsQuery = useQuery({
    queryKey: ['org-items', staff?.orgId],
    queryFn: () => api.orgItems(staff!.orgId),
    enabled: !!staff,
  })
  const items: HelpOrgItem[] = itemsQuery.data?.items ?? []

  const [itemKind, setItemKind] = useState<HelpOrgItemKind>('available')
  const [itemName, setItemName] = useState('')
  const [itemQuantity, setItemQuantity] = useState('')
  const [itemUnit, setItemUnit] = useState('')
  const [itemError, setItemError] = useState<string | null>(null)
  const [editing, setEditing] = useState<HelpOrgItem | null>(null)

  const createItemMutation = useMutation({
    mutationFn: () =>
      api.createOrgItem(staff!.orgId, {
        kind: itemKind,
        name: itemName,
        quantity: itemQuantity === '' ? null : Number(itemQuantity),
        unit: itemUnit || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-items', staff?.orgId] })
      setItemName('')
      setItemQuantity('')
      setItemUnit('')
      setItemError(null)
    },
    onError: (err: Error) => setItemError(err.message),
  })

  const updateItemMutation = useMutation({
    mutationFn: () =>
      api.updateOrgItem(staff!.orgId, editing!.id, {
        kind: editing!.kind,
        name: editing!.name,
        quantity: editing!.quantity,
        unit: editing!.unit,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-items', staff?.orgId] })
      setEditing(null)
      setItemError(null)
    },
    onError: (err: Error) => setItemError(err.message),
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.deleteOrgItem(staff!.orgId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-items', staff?.orgId] })
    },
  })

  if (meQuery.isPending) {
    return <p role="status">Cargando sesión…</p>
  }

  if (meQuery.data?.authenticated === false) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-surface p-8 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight">Mi organización</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Esta sección es para el personal de las organizaciones de la Red de
          ayudas. Inicia sesión para gestionar tu organización.
        </p>
        <Link
          to="/iniciar-sesion"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Iniciar sesión
        </Link>
        <p className="mt-3 text-sm text-fg-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    )
  }

  if (!staff) {
    if (pendingOrgId) {
      return (
        <div className="mx-auto max-w-lg rounded-lg border border-warning-muted bg-warning-muted p-8 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">Mi organización</h1>
          <p className="mt-2 text-sm text-warning">
            Tu solicitud para gestionar una organización está{' '}
            <strong>pendiente de aprobación</strong>. Cuando el manager la
            apruebe podrás publicar pedidos e inventario.
          </p>
          <Link
            to={`/organizacion/${pendingOrgId}`}
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Ver la organización
          </Link>
        </div>
      )
    }

    const orgs = orgsQuery.data?.helpOrgs ?? []
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-surface p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight">Mi organización</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Aún no gestionas ninguna organización de la Red de ayudas. Publica una
          nueva o solicita gestionar una que ya exista.
        </p>
        <Link
          to="/nuevo-centro"
          className="mt-4 inline-block rounded-md bg-org px-4 py-2 text-sm font-semibold text-on-org hover:bg-org-hover"
        >
          Publicar tu organización
        </Link>

        <div className="mt-6 border-t border-border pt-5">
          <label htmlFor="joinOrg" className="text-sm font-medium text-fg-muted">
            ¿Trabajas en una organización ya publicada?
          </label>
          <select
            id="joinOrg"
            value={joinOrgId}
            onChange={(e) => setJoinOrgId(e.target.value)}
            className={`mt-1 ${inputClass}`}
          >
            <option value="">Selecciona una organización…</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          {joinError && (
            <div
              role="alert"
              className="mt-2 rounded-md border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
            >
              {joinError}
            </div>
          )}
          {joinMutation.isSuccess && (
            <div
              role="status"
              className="mt-2 rounded-md border border-accent-muted bg-accent-muted p-3 text-sm text-accent-hover"
            >
              Solicitud enviada. Queda pendiente de aprobación por el manager.
            </div>
          )}
          <button
            type="button"
            disabled={!joinOrgId || joinMutation.isPending}
            onClick={() => joinMutation.mutate()}
            className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {joinMutation.isPending
              ? 'Enviando…'
              : 'Solicitar gestionar esta organización'}
          </button>
        </div>
      </div>
    )
  }

  const org = orgQuery.data
  const allMembers = membersQuery.data?.members ?? []
  const activeMembers = allMembers.filter((m) => m.status === 'active')
  const pendingMembers = allMembers.filter((m) => m.status === 'pending')
  const orgRequests = requestsQuery.data?.requests ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">Mi organización</h1>
        <Button
          onClick={() => api.logout().then(() => window.location.reload())}
          variant="outline"
        >
          Cerrar sesión
        </Button>
      </div>

      {org && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-org-muted px-2 py-0.5 text-xs font-medium text-org-hover">
              {HELP_ORG_CATEGORY_LABELS[org.category] ?? org.category}
            </span>
            <span className="text-sm text-fg-muted">{org.city.name}</span>
            <Link
              to={`/organizacion/${org.id}`}
              className="ml-auto text-sm text-org-hover hover:underline"
            >
              Ver página pública
            </Link>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-fg">{org.name}</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Sesión de <strong>{staff.name}</strong> ({staff.email}) —{' '}
            {staff.role === 'manager' ? 'manager' : 'miembro'}.
          </p>
        </div>
      )}

      {org && staff.role === 'manager' && (
        <section className="mt-4 rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-fg-muted">
              Estado de la organización
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-fg-muted">
                {org.status === 'open' ? 'Abierta' : 'Cerrada'}
              </span>
              {confirmingAction ? (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={toggleStatusMutation.isPending}
                    onClick={() => {
                      toggleStatusMutation.mutate(confirmingAction)
                      setConfirmingAction(null)
                    }}
                  >
                    Confirmar {confirmingAction === 'closed' ? 'cierre' : 'apertura'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingAction(null)}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setConfirmingAction(org.status === 'open' ? 'closed' : 'open')
                  }
                >
                  {org.status === 'open' ? 'Cerrar organización' : 'Reabrir organización'}
                </Button>
              )}
            </div>
          </div>
          {toggleStatusMutation.isError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              No se pudo cambiar el estado de la organización.
            </p>
          )}
          <div className="mt-4 border-t border-border" />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
            <h2 className="text-sm font-semibold text-fg-muted">
              Datos de la organización
            </h2>
            {!profile && (
              <Button
                type="button"
                onClick={() => {
                  setProfile(profileDraftFrom(org))
                  setProfileError(null)
                }}
                variant="outline"
                size="sm"
              >
                Editar perfil
              </Button>
            )}
          </div>

          {profileError && (
            <div
              role="alert"
              className="mt-3 rounded-md border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
            >
              {profileError}
            </div>
          )}

          {profile && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (profile!.contactPhone && !isValidPhone(profile!.contactPhone)) {
                  setProfileError(
                    'Teléfono de contacto inválido: usa entre 7 y 15 dígitos.',
                  )
                  return
                }
                updateProfileMutation.mutate()
              }}
              className="mt-3 space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="profileName" className={labelClass}>
                    Nombre
                  </label>
                  <input
                    id="profileName"
                    required
                    minLength={2}
                    maxLength={140}
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div>
                  <label htmlFor="profileCategory" className={labelClass}>
                    Categoría
                  </label>
                  <select
                    id="profileCategory"
                    value={profile.category}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        category: e.target.value as HelpOrgCategory,
                      })
                    }
                    className={`mt-1 ${inputClass}`}
                  >
                    {Object.entries(HELP_ORG_CATEGORY_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="profileDescription" className={labelClass}>
                  Descripción
                </label>
                <textarea
                  id="profileDescription"
                  maxLength={2000}
                  rows={3}
                  value={profile.description}
                  onChange={(e) =>
                    setProfile({ ...profile, description: e.target.value })
                  }
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div>
                <label htmlFor="profileAddress" className={labelClass}>
                  Dirección o referencia
                </label>
                <input
                  id="profileAddress"
                  maxLength={300}
                  value={profile.address}
                  onChange={(e) =>
                    setProfile({ ...profile, address: e.target.value })
                  }
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="profileContactName" className={labelClass}>
                    Persona de contacto
                  </label>
                  <input
                    id="profileContactName"
                    maxLength={120}
                    value={profile.contactName}
                    onChange={(e) =>
                      setProfile({ ...profile, contactName: e.target.value })
                    }
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <div>
                  <label htmlFor="profileContactPhone" className={labelClass}>
                    Teléfono de contacto
                  </label>
                  <input
                    id="profileContactPhone"
                    type="tel"
                    inputMode="tel"
                    maxLength={30}
                    value={profile.contactPhone}
                    onChange={(e) =>
                      setProfile({ ...profile, contactPhone: e.target.value })
                    }
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="profileHours" className={labelClass}>
                  Horarios
                </label>
                <input
                  id="profileHours"
                  maxLength={200}
                  value={profile.hours}
                  onChange={(e) => setProfile({ ...profile, hours: e.target.value })}
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div>
                <label htmlFor="profileAccepts" className={labelClass}>
                  Qué reciben (opcional)
                </label>
                <textarea
                  id="profileAccepts"
                  maxLength={2000}
                  rows={3}
                  value={profile.accepts}
                  onChange={(e) =>
                    setProfile({ ...profile, accepts: e.target.value })
                  }
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  variant="org"
                >
                  {updateProfileMutation.isPending
                    ? 'Guardando…'
                    : 'Guardar cambios'}
                </Button>
                <Button type="button" onClick={() => setProfile(null)} variant="outline">
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="mt-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-fg-muted">
          Publicar un pedido de la organización
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          El pedido aparecerá en el mapa con el nombre de la organización.
        </p>

        {reqError && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
          >
            {reqError}
          </div>
        )}
        {requestMutation.isSuccess && (
          <div
            role="status"
            className="mt-3 rounded-md border border-accent-muted bg-accent-muted p-3 text-sm text-accent-hover"
          >
            Pedido publicado correctamente.
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            requestMutation.mutate()
          }}
          className="mt-3 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="reqType" className={labelClass}>
                Tipo
              </label>
              <select
                id="reqType"
                value={reqType}
                onChange={(e) => setReqType(e.target.value as RequestType)}
                className={`mt-1 ${inputClass}`}
              >
                {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reqUrgency" className={labelClass}>
                Urgencia
              </label>
              <select
                id="reqUrgency"
                value={reqUrgency}
                onChange={(e) => setReqUrgency(e.target.value as Urgency)}
                className={`mt-1 ${inputClass}`}
              >
                {Object.entries(URGENCY_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="reqTitle" className={labelClass}>
              Título
            </label>
            <input
              id="reqTitle"
              required
              minLength={5}
              maxLength={140}
              value={reqTitle}
              onChange={(e) => setReqTitle(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="reqDescription" className={labelClass}>
              Descripción
            </label>
            <textarea
              id="reqDescription"
              required
              minLength={10}
              maxLength={4000}
              rows={3}
              value={reqDescription}
              onChange={(e) => setReqDescription(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="reqAddress" className={labelClass}>
              Dirección o referencia (opcional)
            </label>
            <input
              id="reqAddress"
              maxLength={300}
              value={reqAddress}
              onChange={(e) => setReqAddress(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <button
            type="submit"
            disabled={requestMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {requestMutation.isPending ? 'Publicando…' : 'Publicar pedido'}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-fg-muted">
          Inventario de la organización
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Publica lo que tienen disponible y lo que necesitan, para coordinar
          donaciones con la comunidad.
        </p>

        {itemError && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
          >
            {itemError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            createItemMutation.mutate()
          }}
          className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label htmlFor="itemKind" className={labelClass}>
              Tipo
            </label>
            <select
              id="itemKind"
              value={itemKind}
              onChange={(e) => setItemKind(e.target.value as HelpOrgItemKind)}
              className={`mt-1 ${inputClass}`}
            >
              {(Object.keys(HELP_ORG_ITEM_KIND_LABELS) as HelpOrgItemKind[]).map(
                (kind) => (
                  <option key={kind} value={kind}>
                    {HELP_ORG_ITEM_KIND_LABELS[kind]}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label htmlFor="itemName" className={labelClass}>
              Elemento
            </label>
            <input
              id="itemName"
              required
              minLength={2}
              maxLength={120}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Ej: agua embotellada"
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="itemQuantity" className={labelClass}>
              Cantidad (opcional)
            </label>
            <input
              id="itemQuantity"
              type="number"
              min={0}
              value={itemQuantity}
              onChange={(e) => setItemQuantity(e.target.value)}
              placeholder="Ej: 40"
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="itemUnit" className={labelClass}>
              Unidad (opcional)
            </label>
            <input
              id="itemUnit"
              maxLength={30}
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
              placeholder="Ej: unidades, kits"
              className={`mt-1 ${inputClass}`}
            />
            <Button
              type="submit"
              disabled={createItemMutation.isPending}
              variant="org"
              size="sm"
              className="mt-1 w-full"
            >
              {createItemMutation.isPending ? 'Agregando…' : 'Agregar elemento'}
            </Button>
          </div>
        </form>

        {items.length > 0 && (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-bg p-3 text-sm"
              >
                {editing && editing.id === item.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      updateItemMutation.mutate()
                    }}
                    onReset={() => setEditing(null)}
                    className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    <select
                      value={editing.kind}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          kind: e.target.value as HelpOrgItemKind,
                        })
                      }
                      className={inputClass}
                      aria-label="Tipo del elemento"
                    >
                      {(Object.keys(HELP_ORG_ITEM_KIND_LABELS) as HelpOrgItemKind[]).map(
                        (kind) => (
                          <option key={kind} value={kind}>
                            {HELP_ORG_ITEM_KIND_LABELS[kind]}
                          </option>
                        ),
                      )}
                    </select>
                    <input
                      value={editing.name}
                      onChange={(e) =>
                        setEditing({ ...editing, name: e.target.value })
                      }
                      required
                      minLength={2}
                      maxLength={120}
                      className={inputClass}
                      aria-label="Nombre del elemento"
                    />
                    <input
                      value={editing.quantity ?? ''}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          quantity:
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      type="number"
                      min={0}
                      className={inputClass}
                      aria-label="Cantidad del elemento"
                    />
                    <div className="flex gap-2">
                      <input
                        value={editing.unit ?? ''}
                        onChange={(e) =>
                          setEditing({ ...editing, unit: e.target.value })
                        }
                        maxLength={30}
                        className={inputClass}
                        aria-label="Unidad del elemento"
                      />
                      <Button
                        type="submit"
                        disabled={updateItemMutation.isPending}
                        variant="org"
                        size="sm"
                      >
                        Guardar
                      </Button>
                      <Button type="reset" variant="outline" size="sm">
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          item.kind === 'available'
                            ? 'rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent-hover'
                            : 'rounded-full bg-danger-muted px-2 py-0.5 text-xs font-medium text-danger'
                        }
                      >
                        {item.kind === 'available' ? 'Disponible' : 'Necesitamos'}
                      </span>
                      <span className="font-medium text-fg">
                        {item.name}
                      </span>
                      <span className="text-fg-muted">{formatItemQuantity(item.quantity, item.unit)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing({ ...item })}
className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-muted hover:bg-border"
                      >
                        Editar
                      </button>
                      <Button
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        disabled={deleteItemMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="border-danger-muted text-danger hover:bg-danger-muted"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {staff.role === 'manager' && (
        <section className="mt-6 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-fg-muted">
            Solicitudes pendientes de aprobación
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Las personas registradas con el correo de tu organización esperan
            que las apruebes para acceder. Revisa quién es cada una antes de
            aprobar.
          </p>

          {memberError && (
            <div
              role="alert"
              className="mt-3 rounded-md border border-danger-muted bg-danger-muted p-3 text-sm text-danger"
            >
              {memberError}
            </div>
          )}

          {pendingMembers.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">
              No hay solicitudes pendientes.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pendingMembers.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-warning-muted bg-warning-muted p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-fg">{member.name}</p>
                    <p className="text-xs text-fg-muted">{member.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      onClick={() => approveMemberMutation.mutate(member.id)}
                      disabled={approveMemberMutation.isPending}
                      variant="org"
                      size="sm"
                    >
                      Aprobar
                    </Button>
                    <Button
                      onClick={() => rejectMemberMutation.mutate(member.id)}
                      disabled={rejectMemberMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="border-danger-muted text-danger hover:bg-danger-muted"
                    >
                      Rechazar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-fg-muted">
          Personal ({activeMembers.length})
        </h2>
        <ul className="mt-2 space-y-2">
          {activeMembers.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm"
            >
              <div>
                <p className="font-medium text-fg">{member.name}</p>
                <p className="text-xs text-fg-muted">{member.email}</p>
              </div>
              <span
                className={
                  member.role === 'manager'
                    ? 'rounded-full bg-primary-muted px-2 py-0.5 text-xs font-medium text-primary'
                    : 'rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted'
                }
              >
                {member.role === 'manager' ? 'Manager' : 'Miembro'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-fg-muted">
          Pedidos publicados por mi organización
        </h2>
        {orgRequests.length === 0 ? (
          <p className="mt-2 text-sm text-fg-muted">
            Aún no has publicado pedidos.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {orgRequests.map((request) => (
              <li key={request.id}>
                <RequestCard request={request} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}