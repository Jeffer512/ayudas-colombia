import { describe, expect, it } from 'vitest'
import { isValidPhone } from './phone'

describe('isValidPhone', () => {
  it('acepta un móvil colombiano sin formato', () => {
    expect(isValidPhone('3105551234')).toBe(true)
  })

  it('acepta un número con separadores y prefijo internacional', () => {
    expect(isValidPhone('+57 (310) 555-1234')).toBe(true)
  })

  it('acepta un número de línea fija de 7 dígitos', () => {
    expect(isValidPhone('3344556')).toBe(true)
  })

  it('acepta vacío y espacios, porque el campo es opcional', () => {
    expect(isValidPhone('')).toBe(true)
    expect(isValidPhone('   ')).toBe(true)
  })

  it('rechaza texto sin dígitos', () => {
    expect(isValidPhone('abc')).toBe(false)
    expect(isValidPhone('teléfono')).toBe(false)
  })

  it('rechaza un número con menos de 7 dígitos', () => {
    expect(isValidPhone('123')).toBe(false)
  })

  it('rechaza un número con más de 15 dígitos', () => {
    expect(isValidPhone('3105551234567890')).toBe(false)
  })

  it('rechaza caracteres fuera del formato de teléfono', () => {
    expect(isValidPhone('3105551234abc')).toBe(false)
    expect(isValidPhone('310 555-1234 ext 5')).toBe(false)
  })
})
