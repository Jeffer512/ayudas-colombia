import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ReporterContact from './ReporterContact'

const reporter = {
  name: 'María Gómez',
  phone: '3158765432',
  whatsapp: '3105550000',
  email: 'maria@correo.com',
}

describe('ReporterContact', () => {
  it('muestra los medios de contacto cuando no está restringido', () => {
    render(
      <MemoryRouter>
        <ReporterContact reporter={reporter} nameLabel="Reporta" restricted={false} />
      </MemoryRouter>,
    )

    expect(screen.getByText('María Gómez')).toBeInTheDocument()
    expect(screen.getByText('3158765432')).toBeInTheDocument()
    expect(screen.getByText('3105550000')).toBeInTheDocument()
    expect(screen.getByText('maria@correo.com')).toBeInTheDocument()
    expect(screen.queryByText('Iniciar sesión')).not.toBeInTheDocument()
  })

  it('oculta el contacto y pide iniciar sesión cuando está restringido', () => {
    render(
      <MemoryRouter>
        <ReporterContact reporter={reporter} nameLabel="Reporta" restricted={true} />
      </MemoryRouter>,
    )

    expect(screen.getByText('María Gómez')).toBeInTheDocument()
    expect(screen.queryByText('3158765432')).not.toBeInTheDocument()
    expect(screen.queryByText('3105550000')).not.toBeInTheDocument()
    expect(screen.queryByText('maria@correo.com')).not.toBeInTheDocument()
    expect(screen.getByText(/Inicia sesión para verlo/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Iniciar sesión' }),
    ).toHaveAttribute('href', '/iniciar-sesion')
  })
})