export const INDEXABLE_ROUTES = ['/', '/red-de-ayudas', '/guia'] as const

const NOFOLLOW_PREFIXES = [
  '/admin',
  '/iniciar-sesion',
  '/registro',
  '/cuenta',
  '/mi-organizacion',
  '/recuperar-contrasena',
  '/restablecer-contrasena',
  '/verificar-correo',
]

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Ayuda Colombia — Coordinación y Donaciones por Terremoto',
  '/red-de-ayudas': 'Red de Ayudas y Centros de Acopio — Ayuda Colombia',
  '/pedir-ayuda': 'Solicitar Ayuda — Ayuda Colombia',
  '/ofrecer-ayuda': 'Ofrecer Ayuda y Donaciones — Ayuda Colombia',
  '/informar': 'Informar — Ayuda Colombia',
  '/transporte': 'Coordinación de Transporte — Ayuda Colombia',
  '/guia': 'Guía de ayuda — Ayuda Colombia',
}

const DEFAULT_DESCRIPTION =
  'Plataforma ciudadana de coordinación de ayuda humanitaria y donaciones tras el terremoto en Colombia.'

const ROUTE_DESCRIPTIONS: Record<string, string> = {
  '/guia':
    'Cómo solicitar ayuda, ofrecer donaciones, abrir centros de acopio y coordinar transporte tras el terremoto en Colombia.',
}

export interface RouteMeta {
  title: string
  description: string
  robots: string
  indexable: boolean
}

export function isEntityRoute(pathname: string): boolean {
  return /^\/(pedido|oferta|aviso|organizacion)\//.test(pathname)
}

export function robotsDirective(pathname: string): string {
  if (
    NOFOLLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.endsWith('/editar')
  ) {
    return 'noindex,nofollow'
  }
  return 'noindex,follow'
}

export function routeMeta(pathname: string): RouteMeta {
  const isIndex = INDEXABLE_ROUTES.includes(pathname as (typeof INDEXABLE_ROUTES)[number])
  return {
    title: ROUTE_TITLES[pathname] ?? 'Ayuda Colombia — Red de Emergencia',
    description: ROUTE_DESCRIPTIONS[pathname] ?? DEFAULT_DESCRIPTION,
    robots: isIndex ? 'index,follow' : robotsDirective(pathname),
    indexable: isIndex,
  }
}
