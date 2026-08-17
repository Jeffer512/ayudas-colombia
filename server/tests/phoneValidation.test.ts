import { describe, expect, it } from 'vitest'
import { createHelpOrgSchema, updateHelpOrgSchema } from '../src/validators/helpOrg.js'
import { createRequestSchema } from '../src/validators/request.js'

const validRequest = {
  type: 'supplies_request',
  title: 'Necesitamos agua potable en el Centro',
  description: 'Las familias del sector requieren agua para cocinar y beber.',
  cityCode: 'pereira',
  reporter: { name: 'María Gómez', phone: '3158765432' },
}

const validOrg = {
  name: 'Centro de acopio La Florida',
  address: 'Carrera 20 # 40-25',
  lat: 4.8133,
  lng: -75.6961,
  cityCode: 'pereira',
  category: 'acopio',
  contactName: 'Maria',
  contactPhone: '3105552222',
}

describe('validación de teléfono en datos de contacto', () => {
  it('rechaza un teléfono con letras', () => {
    expect(() =>
      createRequestSchema.parse({
        ...validRequest,
        reporter: { name: 'María Gómez', phone: 'abc' },
      }),
    ).toThrow()
  })

  it('rechaza un teléfono con menos de 7 dígitos', () => {
    expect(() =>
      createRequestSchema.parse({
        ...validRequest,
        reporter: { name: 'María Gómez', phone: '123' },
      }),
    ).toThrow()
  })

  it('rechaza un teléfono con más de 15 dígitos', () => {
    expect(() =>
      createRequestSchema.parse({
        ...validRequest,
        reporter: { name: 'María Gómez', phone: '3105551234567890' },
      }),
    ).toThrow()
  })

  it('rechaza caracteres fuera del formato de teléfono', () => {
    expect(() =>
      createRequestSchema.parse({
        ...validRequest,
        reporter: { name: 'María Gómez', phone: '310 555-1234 ext 5' },
      }),
    ).toThrow()
  })

  it('acepta separadores y prefijo internacional', () => {
    const parsed = createRequestSchema.parse({
      ...validRequest,
      reporter: { name: 'María Gómez', phone: '+57 (310) 555-1234' },
    })
    expect(parsed.reporter.phone).toBe('+57 (310) 555-1234')
  })

  it('permite dejar el teléfono vacío y usar otro medio', () => {
    const parsed = createRequestSchema.parse({
      ...validRequest,
      reporter: { name: 'Ana Torres', email: 'ana@correo.com', phone: '' },
    })
    expect(parsed.reporter.phone).toBe('')
  })

  it('aplica la misma regla al teléfono de contacto de organizaciones', () => {
    expect(() =>
      createHelpOrgSchema.parse({ ...validOrg, contactPhone: 'veinticuatro siete' }),
    ).toThrow()

    const parsed = createHelpOrgSchema.parse({
      ...validOrg,
      contactPhone: '+57 (310) 555-2222',
    })
    expect(parsed.contactPhone).toBe('+57 (310) 555-2222')
  })

  it('permite limpiar el teléfono de contacto de una organización', () => {
    const parsed = updateHelpOrgSchema.parse({ ...validOrg, contactPhone: null })
    expect(parsed.contactPhone).toBeNull()
  })
})
