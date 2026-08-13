import type { ReactNode } from 'react'

export const MapContainer = ({
  children,
}: {
  children?: ReactNode
}) => <div data-testid="map">{children}</div>

export const TileLayer = () => null

export const Marker = ({
  children,
}: {
  children?: ReactNode
}) => <div data-testid="marker">{children}</div>

export const Popup = ({ children }: { children?: ReactNode }) => (
  <div data-testid="popup">{children}</div>
)

export const useMapEvents = () => null