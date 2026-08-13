import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

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