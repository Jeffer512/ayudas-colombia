import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra la navegación principal y la portada', () => {
    render(<App />)

    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mapa' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reportar' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Reportes de ayuda' }),
    ).toBeInTheDocument()
  })
})