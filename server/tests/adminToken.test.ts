import { describe, expect, it } from 'vitest'
import { isAdminToken } from '../src/lib/admin.js'

describe('isAdminToken', () => {
  const adminToken = 'f9c2a1b3d4e5f6a7b8c9d0e1f2a3b4c5'

  it('acepta el token exacto', () => {
    expect(isAdminToken(adminToken, adminToken)).toBe(true)
  })

  it('rechaza un token distinto', () => {
    expect(isAdminToken('x9c2a1b3d4e5f6a7b8c9d0e1f2a3b4c5', adminToken)).toBe(false)
  })

  it('rechaza valores vacíos', () => {
    expect(isAdminToken('', adminToken)).toBe(false)
    expect(isAdminToken(undefined, adminToken)).toBe(false)
    expect(isAdminToken(adminToken, '')).toBe(false)
  })
})