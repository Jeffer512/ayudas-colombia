import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  name: z.string().trim().min(2).max(120),
  orgId: z.string().trim().min(1).optional(),
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