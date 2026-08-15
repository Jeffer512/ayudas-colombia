import { Link, NavLink, Outlet } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'rounded px-3 py-1 bg-sky-700 text-white font-medium'
    : 'rounded px-3 py-1 text-sky-100 hover:bg-sky-700/60'
}

export default function Layout() {
  const queryClient = useQueryClient()
  const me = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
  })

  const logout = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['me'], {
        authenticated: false,
        name: null,
        email: null,
        staff: null,
      })
    },
  })

  const authenticated = me.data?.authenticated === true

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-sky-800 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Ayudas Pereira
          </Link>
          <nav
            className="flex flex-wrap items-center gap-2 text-sm"
            aria-label="Principal"
          >
            <NavLink to="/" className={navClass} end>
              Inicio
            </NavLink>
            <NavLink to="/pedir-ayuda" className={navClass}>
              Pedir ayuda
            </NavLink>
            <NavLink to="/ofrecer-ayuda" className={navClass}>
              Ofrecer ayuda
            </NavLink>
            <NavLink to="/transporte" className={navClass}>
              Centro de carga
            </NavLink>
            <NavLink to="/red-de-ayudas" className={navClass}>
              Red de ayudas
            </NavLink>
            <NavLink to="/informar" className={navClass}>
              Informar
            </NavLink>
            <NavLink to="/mi-organizacion" className={navClass}>
              Mi organización
            </NavLink>
            <span
              className="mx-1 hidden h-6 w-px bg-sky-600 sm:block"
              aria-hidden="true"
            />
            {authenticated ? (
              <div className="flex items-center gap-1">
                <span className="px-3 py-1 text-sky-100">
                  {me.data?.name ? `Hola, ${me.data.name}` : 'Hola'}
                </span>
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className="rounded px-3 py-1 text-sky-100 hover:bg-sky-700/60 disabled:opacity-50"
                >
                  {logout.isPending ? 'Saliendo…' : 'Salir'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <NavLink to="/iniciar-sesion" className={navClass}>
                  Iniciar sesión
                </NavLink>
                <NavLink to="/registro" className={navClass}>
                  Registrarse
                </NavLink>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-sm text-text-muted">
          Red de ayuda ciudadana — Pereira, Risaralda
        </div>
      </footer>
    </div>
  )
}