import { getRequest } from '../services/requests.js'
import { getOffer } from '../services/offers.js'
import { getAviso } from '../services/avisos.js'
import { getHelpOrg } from '../services/helpOrgs.js'

export interface SeoMeta {
  title: string
  description: string
  canonical: string
  robots: string
  ogType: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  jsonLd?: string | null
}

const INDEXABLE = new Set(['/', '/red-de-ayudas'])

const NOFOLLOW_PREFIXES = [
  '/admin',
  '/iniciar-sesion',
  '/registro',
  '/cuenta',
  '/mi-organizacion',
  '/verificar-correo',
  '/recuperar-contrasena',
  '/restablecer-contrasena',
]

const DEFAULT_DESCRIPTION =
  'Plataforma ciudadana de coordinación de ayuda humanitaria y donaciones tras el terremoto en Colombia.'

function robotsFor(pathname: string): string {
  if (
    NOFOLLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.endsWith('/editar')
  ) {
    return 'noindex,nofollow'
  }
  return 'noindex,follow'
}

type EntityResult =
  | { status: 'ok'; title: string; description: string }
  | { status: 'missing' }
  | { status: 'timeout' }

async function fetchEntityHead(pathname: string): Promise<EntityResult> {
  const matched = pathname.match(/^\/(pedido|oferta|aviso|organizacion)\/([^/]+)$/)
  if (!matched) return { status: 'missing' }
  const kind = matched[1]
  const id = matched[2]
  if (!id) return { status: 'missing' }

  const lookup = (async (): Promise<EntityResult> => {
    try {
      if (kind === 'pedido') {
        const r = await getRequest(id)
        const cityName = r.city?.name ?? 'Colombia'
        return { status: 'ok', title: `${r.title} en ${cityName} — Ayuda Colombia`, description: `Solicitud de ayuda en ${cityName}. Coordinación ciudadana tras el terremoto.` }
      }
      if (kind === 'oferta') {
        const o = await getOffer(id)
        const cityName = o.city?.name ?? 'Colombia'
        return { status: 'ok', title: `${o.title} disponible en ${cityName} — Ayuda Colombia`, description: `Oferta de ayuda en ${cityName}. Coordinación ciudadana tras el terremoto.` }
      }
      if (kind === 'aviso') {
        const a = await getAviso(id)
        const cityName = a.city?.name ?? 'Colombia'
        return { status: 'ok', title: `${a.title} en ${cityName} — Ayuda Colombia`, description: `Aviso en ${cityName}. Coordinación ciudadana tras el terremoto.` }
      }
      const org = await getHelpOrg(id)
      const cityName = org.city?.name ?? 'Colombia'
      return { status: 'ok', title: `${org.name} en ${cityName} — Ayuda Colombia`, description: `Organización de ayuda en ${cityName}. Coordinación ciudadana tras el terremoto.` }
    } catch {
      return { status: 'missing' }
    }
  })()

  const timeout = new Promise<EntityResult>((resolve) => {
    setTimeout(() => resolve({ status: 'timeout' }), 250)
  })

  return Promise.race([lookup, timeout])
}

function homeJsonLd(host: string): string {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Ayuda Colombia',
        url: `${host}/`,
        logo: `${host}/og-image.png`,
      },
      {
        '@type': 'WebSite',
        name: 'Ayuda Colombia',
        url: `${host}/`,
      },
      {
        '@type': 'SpecialAnnouncement',
        name: 'Ayuda tras el terremoto en Colombia',
        text: DEFAULT_DESCRIPTION,
        datePosted: new Date().toISOString(),
        category: 'https://schema.org/NGO',
        spatialCoverage: { '@type': 'Place', name: 'Colombia' },
        url: `${host}/`,
      },
    ],
  }
  return JSON.stringify(graph)
}

function genericMeta(canonical: string, ogImage: string): SeoMeta {
  return {
    title: 'Ayuda Colombia — Red de Emergencia',
    description: DEFAULT_DESCRIPTION,
    canonical,
    robots: 'noindex,follow',
    ogType: 'website',
    ogTitle: 'Ayuda Colombia',
    ogDescription: DEFAULT_DESCRIPTION,
    ogImage,
  }
}

export async function resolveSeo(
  pathname: string,
  host: string,
): Promise<{ status: 200 | 404; meta: SeoMeta }> {
  const canonical = `${host}${pathname === '/' ? '/' : pathname}`
  const ogImage = `${host}/og-image.png`

  if (INDEXABLE.has(pathname)) {
    const title =
      pathname === '/'
        ? 'Ayuda Colombia — Coordinación y Donaciones por Terremoto'
        : 'Red de Ayudas y Centros de Acopio — Ayuda Colombia'
    return {
      status: 200,
      meta: {
        title,
        description: DEFAULT_DESCRIPTION,
        canonical,
        robots: 'index,follow',
        ogType: 'website',
        ogTitle: title,
        ogDescription: DEFAULT_DESCRIPTION,
        ogImage,
        jsonLd: homeJsonLd(host),
      },
    }
  }

  if (/^\/(pedido|oferta|aviso|organizacion)\/[^/]+$/.test(pathname)) {
    const entity = await fetchEntityHead(pathname)
    if (entity.status === 'ok') {
      return {
        status: 200,
        meta: {
          title: entity.title,
          description: entity.description,
          canonical,
          robots: 'noindex,follow',
          ogType: 'article',
          ogTitle: entity.title,
          ogDescription: entity.description,
          ogImage,
        },
      }
    }
    if (entity.status === 'missing') {
      return {
        status: 404,
        meta: {
          ...genericMeta(canonical, ogImage),
          title: 'Ayuda Colombia — Red de Emergencia',
          description: 'Esta página ya no está disponible.',
          ogTitle: 'Ayuda Colombia — Red de Emergencia',
          ogDescription: 'Esta página ya no está disponible.',
        },
      }
    }
    return { status: 200, meta: genericMeta(canonical, ogImage) }
  }

  return { status: 200, meta: { ...genericMeta(canonical, ogImage), robots: robotsFor(pathname) } }
}
