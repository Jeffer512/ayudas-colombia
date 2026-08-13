import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
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

export default function Map({ center, marker, onPick }: MapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      className="h-72 w-full rounded-lg border border-slate-300"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {marker ? <Marker position={[marker.lat, marker.lng]} /> : null}
    </MapContainer>
  )
}