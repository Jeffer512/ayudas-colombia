import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HeartHandshake, LogIn, LogOut, Menu, Settings, UserPlus, X } from 'lucide-react'
import { api } from '../api/client'
import Button, { buttonVariants } from './ui/Button'

const NAV_LINKS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/pedir-ayuda', label: 'Pedir ayuda' },
  { to: '/ofrecer-ayuda', label: 'Ofrecer ayuda' },
  { to: '/transporte', label: 'Centro de carga' },
  { to: '/red-de-ayudas', label: 'Red de ayudas' },
  { to: '/chat', label: 'Chat' },
  { to: '/informar', label: 'Informar' },
  { to: '/mi-organizacion', label: 'Mi organización' },
]

const PRIMARY_LINKS = NAV_LINKS.filter((link) => !['/chat', '/mi-organizacion'].includes(link.to))
const SECONDARY_LINKS = NAV_LINKS.filter((link) =>
  ['/chat', '/mi-organizacion'].includes(link.to),
)

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
    isActive
      ? 'bg-surface-2 font-medium text-fg'
      : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  ].join(' ')
}

function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
        <HeartHandshake size={18} aria-hidden="true" />
      </span>
      <span className="hidden font-display text-lg font-bold tracking-tight sm:inline">
        Comunidad de ayuda
      </span>
    </Link>
  )
}

export default function Layout() {
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)

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
        emailVerified: false,
        pendingOrgId: null,
      })
    },
  })

  const authenticated = me.data?.authenticated === true

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const drawerLinks = NAV_LINKS.map((link) => (
    <NavLink
      key={link.to}
      to={link.to}
      end={link.end}
      onClick={() => setMenuOpen(false)}
      className={navLinkClass}
    >
      {link.label}
    </NavLink>
  ))

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Button
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls="nav-drawer"
            variant="ghost"
            size="md"
            className="shrink-0 px-2.5 lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu size={20} aria-hidden="true" />
          </Button>

          <Brand />

          <nav aria-label="Principal" className="ml-6 hidden items-center gap-1 lg:flex">
            {PRIMARY_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
            <div className="hidden xl:flex">
              {SECONDARY_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {authenticated ? (
              <>
                <span className="hidden px-2 text-sm text-fg-muted md:inline">
                  {me.data?.name ? `Hola, ${me.data.name}` : 'Hola'}
                </span>
                <Link
                  to="/cuenta"
                  className={`${buttonVariants({ variant: 'ghost', size: 'sm' })}`}
                >
                  <Settings size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">Mi cuenta</span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                >
                  <LogOut size={16} aria-hidden="true" />
                  {logout.isPending ? 'Saliendo…' : 'Salir'}
                </Button>
              </>
            ) : (
              <>
                <Link
                  className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} hidden sm:inline-flex`}
                  to="/iniciar-sesion"
                >
                  <LogIn size={16} aria-hidden="true" />
                  Iniciar sesión
                </Link>
                <Link
                  className={buttonVariants({ variant: 'primary', size: 'sm' })}
                  to="/registro"
                >
                  <UserPlus size={16} aria-hidden="true" />
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div
        id="nav-drawer"
        inert={!menuOpen}
        className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!menuOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-normal ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal"
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-lg transition-transform duration-normal ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Brand />
            <Button
              variant="ghost"
              size="md"
              aria-label="Cerrar menú"
              className="shrink-0 px-2.5"
              onClick={() => setMenuOpen(false)}
            >
              <X size={20} aria-hidden="true" />
            </Button>
          </div>
          <nav aria-label="Principal móvil" className="flex-1 space-y-1 overflow-y-auto p-4">
            {drawerLinks}
            <NavLink
              to="/mi-organizacion"
              onClick={() => setMenuOpen(false)}
              className={navLinkClass}
            >
              Mi organización
            </NavLink>
            {authenticated ? (
              <div className="mt-4 space-y-1 border-t border-border pt-4">
                <NavLink
                  to="/cuenta"
                  onClick={() => setMenuOpen(false)}
                  className={navLinkClass}
                >
                  <Settings size={18} aria-hidden="true" />
                  Mi cuenta
                </NavLink>
                <Button
                  variant="ghost"
                  size="md"
                  className="w-full justify-start"
                  onClick={() => {
                    setMenuOpen(false)
                    logout.mutate()
                  }}
                  disabled={logout.isPending}
                >
                  <LogOut size={18} aria-hidden="true" />
                  {logout.isPending ? 'Saliendo…' : 'Salir'}
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-1 border-t border-border pt-4">
                <NavLink
                  to="/iniciar-sesion"
                  onClick={() => setMenuOpen(false)}
                  className={navLinkClass}
                >
                  <LogIn size={18} aria-hidden="true" />
                  Iniciar sesión
                </NavLink>
                <NavLink
                  to="/registro"
                  onClick={() => setMenuOpen(false)}
                  className={navLinkClass}
                >
                  <UserPlus size={18} aria-hidden="true" />
                  Registrarse
                </NavLink>
              </div>
            )}
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-sm text-fg-muted sm:px-6 lg:px-8">
          <nav aria-label="Información" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/guia" className="hover:text-fg">
              Cómo usar?
            </Link>
            <Link to="/red-de-ayudas" className="hover:text-fg">
              Red de ayudas
            </Link>
          </nav>
          <span>Red de ayuda ciudadana</span>
        </div>
      </footer>
    </div>
  )
}