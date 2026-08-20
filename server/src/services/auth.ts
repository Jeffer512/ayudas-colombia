import bcrypt from 'bcryptjs'
import { env } from '../config.js'
import { prisma } from '../db.js'
import {
  sendVerificationEmail,
  buildVerificationUrl,
  sendResetPasswordEmail,
  buildResetPasswordUrl,
} from '../lib/email.js'
import { ApiError } from '../lib/errors.js'
import {
  generateVerifyToken,
  hashVerifyToken,
  VERIFY_TOKEN_TTL_MS,
} from '../lib/verification.js'
import type {
  DeleteAccountInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  UpdateAccountInput,
  VerifyEmailInput,
} from '../validators/auth.js'

const ROUNDS = 10

type MembershipWithUser = {
  id: string
  userId: string
  role: string
  orgId: string
  status: string
  user: { email: string; name: string }
}

export function serializeStaff(membership: MembershipWithUser) {
  return {
    id: membership.id,
    userId: membership.userId,
    email: membership.user.email,
    name: membership.user.name,
    role: membership.role,
    orgId: membership.orgId,
    status: membership.status,
  }
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  })
  if (existing) {
    throw new ApiError(409, 'Ya existe una cuenta con este correo')
  }

  const passwordHash = await bcrypt.hash(input.password, ROUNDS)
  const verifyToken = generateVerifyToken()

  await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      verifyTokenHash: hashVerifyToken(verifyToken),
      verifyTokenExpiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  })

  await sendVerificationEmail({
    to: input.email,
    name: input.name,
    token: verifyToken,
  })

  return {
    verificationUrl: env.production ? null : buildVerificationUrl(verifyToken),
  }
}

export async function verifyEmail(input: VerifyEmailInput) {
  const tokenHash = hashVerifyToken(input.token)
  const user = await prisma.user.findFirst({
    where: { verifyTokenHash: tokenHash },
  })
  if (
    !user ||
    !user.verifyTokenExpiresAt ||
    user.verifyTokenExpiresAt < new Date()
  ) {
    throw new ApiError(400, 'El enlace de verificación no es válido o expiró')
  }
  if (!user.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        verifyTokenHash: null,
        verifyTokenExpiresAt: null,
      },
    })
  }
  return { ok: true }
}

export async function resendVerification(input: ResendVerificationInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  })
  if (!user || user.emailVerifiedAt) {
    return { ok: true }
  }

  const verifyToken = generateVerifyToken()
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verifyTokenHash: hashVerifyToken(verifyToken),
      verifyTokenExpiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  })
  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    token: verifyToken,
  })
  return { ok: true }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  })
  if (!user) {
    throw new ApiError(401, 'Correo o contraseña incorrectos')
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash)
  if (!ok) {
    throw new ApiError(401, 'Correo o contraseña incorrectos')
  }
  if (!user.emailVerifiedAt) {
    throw new ApiError(
      403,
      'Debes verificar tu correo antes de ingresar',
      'email_unverified',
    )
  }

  const membership = await prisma.helpOrgStaff.findUnique({
    where: { userId: user.id },
    include: { user: true },
  })

  if (membership && membership.status !== 'active') {
    throw new ApiError(
      403,
      'Tu solicitud de vinculación está pendiente de aprobación',
      'membership_pending',
    )
  }

  return {
    user,
    membership,
    staff: membership ? serializeStaff(membership) : null,
  }
}

export async function getSessionUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: { include: { user: true } },
    },
  })
  if (!user) return null
  const activeMembership =
    user.memberships.find((m) => m.status === 'active') ?? null
  return {
    email: user.email,
    name: user.name,
    staff: activeMembership ? serializeStaff(activeMembership) : null,
    emailVerified: user.emailVerifiedAt !== null,
    pendingOrgId:
      user.memberships.find((m) => m.status === 'pending')?.orgId ?? null,
  }
}

export async function updateAccount(userId: string, input: UpdateAccountInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new ApiError(404, 'Cuenta no encontrada')
  }

  if (input.email && input.email !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    })
    if (existing) {
      throw new ApiError(409, 'Ya existe una cuenta con este correo')
    }
    const ok = await bcrypt.compare(input.password!, user.passwordHash)
    if (!ok) {
      throw new ApiError(401, 'Contraseña incorrecta', 'invalid_password')
    }

    const verifyToken = generateVerifyToken()
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name ?? user.name,
        email: input.email,
        emailVerifiedAt: null,
        verifyTokenHash: hashVerifyToken(verifyToken),
        verifyTokenExpiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
    })

    await sendVerificationEmail({
      to: input.email,
      name: input.name ?? user.name,
      token: verifyToken,
    })

    return {
      name: input.name ?? user.name,
      email: input.email,
      emailChanged: true,
      verificationUrl: env.production ? null : buildVerificationUrl(verifyToken),
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: input.name ? { name: input.name } : {},
  })

  return {
    name: updated.name,
    email: updated.email,
    emailChanged: false,
    verificationUrl: null,
  }
}

export async function deleteAccount(userId: string, input: DeleteAccountInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new ApiError(404, 'Cuenta no encontrada')
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash)
  if (!ok) {
    throw new ApiError(401, 'Contraseña incorrecta', 'invalid_password')
  }

  await prisma.user.delete({ where: { id: userId } })
  return { ok: true }
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  })
  if (!user) return { ok: true, resetUrl: null }

  const resetToken = generateVerifyToken()
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: hashVerifyToken(resetToken),
      resetTokenExpiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  })
  await sendResetPasswordEmail({
    to: user.email,
    name: user.name,
    token: resetToken,
  })
  return {
    ok: true,
    resetUrl: env.production ? null : buildResetPasswordUrl(resetToken),
  }
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashVerifyToken(input.token)
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash },
  })
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    throw new ApiError(400, 'El enlace no es válido o expiró')
  }

  const passwordHash = await bcrypt.hash(input.password, ROUNDS)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    },
  })
  return { ok: true }
}