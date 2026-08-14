import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import type { LoginInput, RegisterInput } from '../validators/auth.js'

const ROUNDS = 10

type StaffRecord = {
  id: string
  email: string
  name: string
  role: string
  orgId: string
}

export function serializeStaff(staff: StaffRecord) {
  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    orgId: staff.orgId,
  }
}

export async function registerStaff(input: RegisterInput) {
  const existing = await prisma.acopioStaff.findUnique({
    where: { email: input.email },
  })
  if (existing) {
    throw new ApiError(409, 'Ya existe una cuenta con este correo')
  }

  const org = await prisma.acopioCenter.findUnique({ where: { id: input.orgId } })
  if (!org) {
    throw new ApiError(404, 'Organización no encontrada')
  }

  const staffCount = await prisma.acopioStaff.count({
    where: { orgId: input.orgId },
  })

  const passwordHash = await bcrypt.hash(input.password, ROUNDS)
  const staff = await prisma.acopioStaff.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: staffCount === 0 ? 'manager' : 'member',
      orgId: input.orgId,
    },
  })
  return { staff: serializeStaff(staff) }
}

export async function loginStaff(input: LoginInput) {
  const staff = await prisma.acopioStaff.findUnique({
    where: { email: input.email },
  })
  if (!staff) {
    throw new ApiError(401, 'Correo o contraseña incorrectos')
  }
  const ok = await bcrypt.compare(input.password, staff.passwordHash)
  if (!ok) {
    throw new ApiError(401, 'Correo o contraseña incorrectos')
  }
  return { staff: serializeStaff(staff) }
}

export async function getStaffById(id: string) {
  const staff = await prisma.acopioStaff.findUnique({ where: { id } })
  if (!staff) return null
  return serializeStaff(staff)
}