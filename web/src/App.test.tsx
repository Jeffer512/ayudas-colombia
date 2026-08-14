import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra la navegación principal y la portada', () => {
    render(<App />)

    expect(
      screen.getByRole('navigation', { name: 'Principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir ayuda' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ofrecer ayuda' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Red de ayudas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Informar' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Mi organización' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Ayuda en Pereira' }),
    ).toBeInTheDocument()
  })
})