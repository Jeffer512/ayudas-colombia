import nodemailer from 'nodemailer'
import { env } from '../config.js'

export function buildVerificationUrl(token: string): string {
  return `${env.frontendUrl}/verificar-correo?token=${token}`
}

export function buildResetPasswordUrl(token: string): string {
  return `${env.frontendUrl}/restablecer-contrasena?token=${token}`
}

const transport = env.smtpUrl
  ? nodemailer.createTransport(env.smtpUrl)
  : nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true })

export async function sendVerificationEmail(opts: {
  to: string
  name: string
  token: string
  code: string
}) {
  const url = buildVerificationUrl(opts.token)
  await transport.sendMail({
    from: env.mailFrom,
    to: opts.to,
    subject: 'Verifica tu correo — Red de ayudas',
    text: [
      `Hola ${opts.name},`,
      '',
      'Para activar tu cuenta en la Red de ayudas, elige una de estas dos opciones:',
      '',
      `Opción 1 — Código de verificación: ${opts.code}`,
      'Escribe este código de 6 dígitos en la pantalla de verificación.',
      '',
      'Opción 2 — Enlace de verificación:',
      url,
      '',
      'El código y el enlace son válidos por 24 horas. Si no creaste una cuenta, ignora este correo.',
    ].join('\n'),
    html: [
      `<p>Hola <strong>${opts.name}</strong>,</p>`,
      '<p>Para activar tu cuenta en la Red de ayudas, elige una de estas dos opciones:</p>',
      `<p><strong>Opción 1 — Código de verificación:</strong> <span style="font-size:1.25rem;letter-spacing:0.3em">${opts.code}</span></p>`,
      '<p>Escribe este código de 6 dígitos en la pantalla de verificación.</p>',
      '<p><strong>Opción 2 — Enlace de verificación:</strong></p>',
      `<p><a href="${url}">Verificar mi correo</a></p>`,
      '<p>El código y el enlace son válidos por 24 horas. Si no creaste una cuenta, ignora este correo.</p>',
    ].join('\n'),
  })
  if (!env.smtpUrl) {
    console.log(`[email:dev] verificacion de ${opts.to} -> ${url} (codigo ${opts.code})`)
  }
}

export async function sendResetPasswordEmail(opts: {
  to: string
  name: string
  token: string
}) {
  const url = buildResetPasswordUrl(opts.token)
  await transport.sendMail({
    from: env.mailFrom,
    to: opts.to,
    subject: 'Restablece tu contraseña — Red de ayudas',
    text: [
      `Hola ${opts.name},`,
      '',
      'Recibimos una solicitud para restablecer tu contraseña. Abre este enlace:',
      url,
      '',
      'El enlace es válido por 24 horas. Si no lo solicitaste, ignora este correo.',
    ].join('\n'),
    html: [
      `<p>Hola <strong>${opts.name}</strong>,</p>`,
      '<p>Recibimos una solicitud para restablecer tu contraseña. Abre este enlace:</p>',
      `<p><a href="${url}">Restablecer mi contraseña</a></p>`,
      '<p>El enlace es válido por 24 horas. Si no lo solicitaste, ignora este correo.</p>',
    ].join('\n'),
  })
  if (!env.smtpUrl) {
    console.log(`[email:dev] restablecer contrasena de ${opts.to} -> ${url}`)
  }
}