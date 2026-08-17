import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import HelpOrgCard from './HelpOrgCard'
import type { HelpOrg } from '../lib/types'

function org(overrides: Partial<HelpOrg> = {}): HelpOrg {
  return {
    id: 'o1',
    type: 'ciudadano',
    category: 'acopio',
    name: 'Centro La Florida',
    description: null,
    address: null,
    lat: null,
    lng: null,
    city: { code: 'pereira', name: 'Pereira' },
    contactName: null,
    contactPhone: null,
    hours: null,
    accepts: null,
    status: 'open',
    managed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function renderCard(helpOrg: HelpOrg) {
  return render(
    <MemoryRouter>
      <HelpOrgCard org={helpOrg} />
    </MemoryRouter>,
  )
}

describe('HelpOrgCard', () => {
  it('muestra el distintivo de organización gestionada cuando managed es true', () => {
    renderCard(org({ managed: true }))

    expect(screen.getByText('Gestionada por su equipo')).toBeInTheDocument()
  })

  it('omite el distintivo cuando la organización no es gestionada', () => {
    renderCard(org({ managed: false }))

    expect(screen.queryByText('Gestionada por su equipo')).not.toBeInTheDocument()
  })
})