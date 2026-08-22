import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { isEntityRoute, routeMeta } from './routeMeta'

function setMetaName(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

function setMetaProperty(property: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.content = content
}

interface PageHeadOverride {
  title?: string
  description?: string
  robots?: string
}

export function usePageHead(override?: PageHeadOverride) {
  const { pathname } = useLocation()

  useEffect(() => {
    const baseMeta = routeMeta(pathname)
    const skipContent = isEntityRoute(pathname) && !override
    const title = override?.title ?? baseMeta.title
    const description = override?.description ?? baseMeta.description
    const robots = override?.robots ?? baseMeta.robots

    if (!skipContent) {
      document.title = title
      setMetaName('description', description)
      setMetaProperty('og:title', title)
      setMetaProperty('og:description', description)
    }
    setMetaName('robots', robots)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = window.location.origin + (pathname === '/' ? '/' : pathname)
  }, [pathname, override?.title, override?.description, override?.robots])
}
