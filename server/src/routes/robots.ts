import { Router } from 'express'

export const robotsRouter = Router()

const DISALLOWED = [
  '/admin',
  '/iniciar-sesion',
  '/registro',
  '/cuenta',
  '/mi-organizacion',
  '/verificar-correo',
  '/recuperar-contrasena',
  '/restablecer-contrasena',
  '/*/editar',
]

robotsRouter.get('/robots.txt', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`
  const lines = [
    'User-agent: *',
    'Allow: /',
    ...DISALLOWED.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ]
  res.type('text/plain').send(lines.join('\n'))
})
