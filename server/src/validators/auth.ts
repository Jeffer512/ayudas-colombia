import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  name: z.string().trim().min(2).max(120),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(100),
})

export type LoginInput = z.infer<typeof loginSchema>

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(20).max(200),
})

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(8).max(100),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    password: z.string().min(1).max(100).optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined, {
    message: 'Debes indicar un nombre o un correo',
  })
  .refine((value) => value.email === undefined || value.password !== undefined, {
    message: 'Escribe tu contraseña actual para cambiar el correo',
  })

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(100),
})

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>