import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { formatItemQuantity } from '../lib/format'
import RequestCard from '../components/RequestCard'
import {
  HELP_ORG_CATEGORY_LABELS,
  HELP_ORG_ITEM_KIND_LABELS,
  REQUEST_TYPE_LABELS,
  URGENCY_META,
} from '../lib/constants'
import type { HelpOrgItem, HelpOrgItemKind, RequestType, Urgency } from '../lib/types'

const inputClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-sky-500 focus:outline-none'

const labelClass = 'text-sm font-medium text-text-muted'

export default function MyOrgPage() {
  const queryClient = useQueryClient()

  const meQuery = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false })
  const staff = meQuery.data?.staff

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
        cityCode: orgQuery.data?.city.code ?? cities[0]?.code ?? 'pereira',
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

  if (!staff) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-line bg-surface p-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Mi organización</h1>
        <p className="mt-2 text-sm text-text-muted">
          Esta sección es para el personal de las organizaciones de la Red de
          ayudas. Inicia sesión para gestionar tu organización.
        </p>
        <Link
          to="/iniciar-sesion"
          className="mt-4 inline-block rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Iniciar sesión
        </Link>
        <p className="mt-3 text-sm text-text-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-sky-700 hover:underline">
            Regístrate
          </Link>
        </p>
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
        <h1 className="text-2xl font-bold tracking-tight">Mi organización</h1>
        <button
          onClick={() => api.logout().then(() => window.location.reload())}
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-text-muted hover:bg-page"
        >
          Cerrar sesión
        </button>
      </div>

      {org && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-teal-100 dark:bg-teal-950/40 px-2 py-0.5 text-xs font-medium text-teal-800 dark:text-teal-300">
              {HELP_ORG_CATEGORY_LABELS[org.category] ?? org.category}
            </span>
            <span className="text-sm text-text-muted">{org.city.name}</span>
            <Link
              to={`/organizacion/${org.id}`}
              className="ml-auto text-sm text-teal-700 dark:text-teal-300 hover:underline"
            >
              Ver página pública
            </Link>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-text-main">{org.name}</h2>
          <p className="mt-1 text-sm text-text-muted">
            Sesión de <strong>{staff.name}</strong> ({staff.email}) —{' '}
            {staff.role === 'manager' ? 'manager' : 'miembro'}.
          </p>
        </div>
      )}

      <section className="mt-6 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-text-muted">
          Publicar un pedido de la organización
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          El pedido aparecerá en el mapa con el nombre de la organización.
        </p>

        {reqError && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300"
          >
            {reqError}
          </div>
        )}
        {requestMutation.isSuccess && (
          <div
            role="status"
            className="mt-3 rounded-md border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-3 text-sm text-green-700 dark:text-green-300"
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
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
          >
            {requestMutation.isPending ? 'Publicando…' : 'Publicar pedido'}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-text-muted">
          Inventario de la organización
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Publica lo que tienen disponible y lo que necesitan, para coordinar
          donaciones con la comunidad.
        </p>

        {itemError && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300"
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
            <button
              type="submit"
              disabled={createItemMutation.isPending}
              className="mt-1 w-full rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {createItemMutation.isPending ? 'Agregando…' : 'Agregar elemento'}
            </button>
          </div>
        </form>

        {items.length > 0 && (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-line bg-page p-3 text-sm"
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
                      <button
                        type="submit"
                        disabled={updateItemMutation.isPending}
                        className="rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800"
                      >
                        Guardar
                      </button>
                      <button
                        type="reset"
                        className="rounded-md border border-line bg-surface px-3 text-sm text-text-muted hover:bg-page"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          item.kind === 'available'
                            ? 'rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300'
                            : 'rounded-full bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 text-xs font-medium text-rose-800 dark:text-rose-300'
                        }
                      >
                        {item.kind === 'available' ? 'Disponible' : 'Necesitamos'}
                      </span>
                      <span className="font-medium text-text-main">
                        {item.name}
                      </span>
                      <span className="text-text-muted">{formatItemQuantity(item.quantity, item.unit)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing({ ...item })}
                        className="rounded-md border border-line bg-surface px-3 py-1 text-xs font-medium text-text-muted hover:bg-page dark:hover:bg-white/10"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        disabled={deleteItemMutation.isPending}
                        className="rounded-md border border-red-200 dark:border-red-900 bg-surface px-3 py-1 text-xs font-medium text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {staff.role === 'manager' && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-text-muted">
            Solicitudes pendientes de aprobación
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Las personas registradas con el correo de tu organización esperan
            que las apruebes para acceder. Revisa quién es cada una antes de
            aprobar.
          </p>

          {memberError && (
            <div
              role="alert"
              className="mt-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300"
            >
              {memberError}
            </div>
          )}

          {pendingMembers.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">
              No hay solicitudes pendientes.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pendingMembers.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40/50 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-text-main">{member.name}</p>
                    <p className="text-xs text-text-muted">{member.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => approveMemberMutation.mutate(member.id)}
                      disabled={approveMemberMutation.isPending}
                      className="rounded-md bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => rejectMemberMutation.mutate(member.id)}
                      disabled={rejectMemberMutation.isPending}
                      className="rounded-md border border-red-200 dark:border-red-900 bg-surface px-3 py-1 text-xs font-medium text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      Rechazar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-text-muted">
          Personal ({activeMembers.length})
        </h2>
        <ul className="mt-2 space-y-2">
          {activeMembers.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-line bg-surface p-3 text-sm"
            >
              <div>
                <p className="font-medium text-text-main">{member.name}</p>
                <p className="text-xs text-text-muted">{member.email}</p>
              </div>
              <span
                className={
                  member.role === 'manager'
                    ? 'rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800'
                    : 'rounded-full bg-page dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-text-muted'
                }
              >
                {member.role === 'manager' ? 'Manager' : 'Miembro'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-text-muted">
          Pedidos publicados por mi organización
        </h2>
        {orgRequests.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
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