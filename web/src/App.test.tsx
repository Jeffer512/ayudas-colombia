import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra la navegación principal y la portada', () => {
    render(<App />)

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Pedir ayuda' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Ofrecer ayuda' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Centro de carga' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Red de ayudas' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Informar' })).toBeInTheDocument()
    expect(
      within(nav).getByRole('link', { name: 'Mi organización' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Ayuda en Pereira' }),
    ).toBeInTheDocument()
  })
})