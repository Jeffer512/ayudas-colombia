import { Link, NavLink, Outlet } from 'react-router-dom'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'rounded px-3 py-1 bg-sky-700 text-white font-medium'
    : 'rounded px-3 py-1 text-sky-100 hover:bg-sky-700/60'
}

export default function Layout() {
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
            <NavLink to="/centros-de-acopio" className={navClass}>
              Centros de acopio
            </NavLink>
            <NavLink to="/informar" className={navClass}>
              Informar
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-sm text-slate-500">
          Red de ayuda ciudadana — Pereira, Risaralda
        </div>
      </footer>
    </div>
  )
}