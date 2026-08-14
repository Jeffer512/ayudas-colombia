import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import OrgInventory from '../components/OrgInventory'
import type { HelpOrgItem } from '../lib/types'

function item(overrides: Partial<HelpOrgItem>): HelpOrgItem {
  return {
    id: 'i1',
    orgId: 'o1',
    kind: 'available',
    name: 'Agua',
    quantity: 100,
    unit: 'botellas',
    updatedBy: 'Manager',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('OrgInventory', () => {
  it('muestra lo disponible y lo que necesitan con sus cantidades', () => {
    render(
      <OrgInventory
        items={[
          item({ id: '1', name: 'Agua', quantity: 100, unit: 'botellas' }),
          item({
            id: '2',
            kind: 'needed',
            name: 'Colchonetas',
            quantity: 40,
            unit: 'unidades',
          }),
        ]}
      />,
    )

    expect(screen.getByText('Tenemos disponible')).toBeInTheDocument()
    expect(screen.getByText('Necesitamos')).toBeInTheDocument()
    expect(screen.getByText('Agua')).toBeInTheDocument()
    expect(screen.getByText('100 botellas')).toBeInTheDocument()
    expect(screen.getByText('Colchonetas')).toBeInTheDocument()
    expect(screen.getByText('40 unidades')).toBeInTheDocument()
  })

  it('muestra la fecha relativa del inventario', () => {
    render(<OrgInventory items={[item({})]} />)

    expect(
      screen.getByText(/Inventario actualizado hace un momento/),
    ).toBeInTheDocument()
  })

  it('no renderiza nada si no hay elementos', () => {
    const { container } = render(<OrgInventory items={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('limita la cantidad de elementos mostrados', () => {
    render(
      <OrgInventory
        items={[item({ id: '1', name: 'Primero' }), item({ id: '2', name: 'Segundo' })]}
        limit={1}
      />,
    )

    expect(screen.getByText('Primero')).toBeInTheDocument()
    expect(screen.queryByText('Segundo')).not.toBeInTheDocument()
  })
})
