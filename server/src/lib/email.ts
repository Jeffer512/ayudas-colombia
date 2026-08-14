import nodemailer from 'nodemailer'
import { env } from '../config.js'

export function buildVerificationUrl(token: string): string {
  return `${env.frontendUrl}/verificar-correo?token=${token}`
}

const transport = env.smtpUrl
  ? nodemailer.createTransport(env.smtpUrl)
  : nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true })

export async function sendVerificationEmail(opts: {
  to: string
  name: string
  token: string
}) {
  const url = buildVerificationUrl(opts.token)
  await transport.sendMail({
    from: env.mailFrom,
    to: opts.to,
    subject: 'Verifica tu correo — Red de ayudas',
    text: [
      `Hola ${opts.name},`,
      '',
      'Para activar tu cuenta en la Red de ayudas, abre este enlace:',
      url,
      '',
      'El enlace es válido por 24 horas. Si no creaste una cuenta, ignora este correo.',
    ].join('\n'),
    html: [
      `<p>Hola <strong>${opts.name}</strong>,</p>`,
      '<p>Para activar tu cuenta en la Red de ayudas, abre este enlace:</p>',
      `<p><a href="${url}">Verificar mi correo</a></p>`,
      '<p>El enlace es válido por 24 horas. Si no creaste una cuenta, ignora este correo.</p>',
    ].join('\n'),
  })
  if (!env.smtpUrl) {
    console.log(`[email:dev] verificacion de ${opts.to} -> ${url}`)
  }
}