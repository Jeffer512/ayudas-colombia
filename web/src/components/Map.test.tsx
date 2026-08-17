import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Map from './Map'

const { flyTo, map } = vi.hoisted(() => {
  const flyTo = vi.fn()
  return { flyTo, map: { flyTo, getZoom: () => 13 } }
})

vi.mock('react-leaflet', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('react-leaflet')>()
  return {
    ...actual,
    MapContainer: ({ children }: { children?: ReactNode }) => (
      <div data-testid="map-container">{children}</div>
    ),
    TileLayer: () => null,
    Marker: () => <div data-testid="marker" />,
    useMapEvents: () => null,
    useMap: () => map,
  }
})

describe('Map', () => {
  beforeEach(() => {
    flyTo.mockClear()
  })

  it('se centra en el centro inicial sin volar a él', () => {
    render(<Map center={{ lat: 4.8133, lng: -75.6961 }} />)

    expect(flyTo).not.toHaveBeenCalled()
  })

  it('no vuelve a centrar si el centro no cambia', () => {
    const { rerender } = render(
      <Map center={{ lat: 4.8133, lng: -75.6961 }} />,
    )

    rerender(<Map center={{ lat: 4.8133, lng: -75.6961 }} />)

    expect(flyTo).not.toHaveBeenCalled()
  })

  it('recentra el mapa cuando cambia el centro elegido', () => {
    const { rerender } = render(
      <Map center={{ lat: 4.8133, lng: -75.6961 }} />,
    )

    rerender(<Map center={{ lat: 5.0689, lng: -75.5174 }} />)

    expect(flyTo).toHaveBeenCalledWith([5.0689, -75.5174], 13)
  })
})