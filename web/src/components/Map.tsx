import { useEffect, useRef } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import './leaflet'

interface MapProps {
  center: { lat: number; lng: number }
  marker?: { lat: number; lng: number } | null
  onPick?: (lat: number, lng: number) => void
}

function ClickHandler({ onPick }: { onPick?: MapProps['onPick'] }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapFollower({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap()
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    map.flyTo([center.lat, center.lng], map.getZoom())
  }, [map, center.lat, center.lng])
  return null
}

export default function Map({ center, marker, onPick }: MapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      className="isolate h-72 w-full rounded-lg border border-border"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapFollower center={center} />
      <ClickHandler onPick={onPick} />
      {marker ? <Marker position={[marker.lat, marker.lng]} /> : null}
    </MapContainer>
  )
}