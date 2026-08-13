import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { DIRECTION_META } from '../lib/constants'
import type { AcopioCenter, Direction, Report } from '../lib/types'
import { L } from './leaflet'

const MARKER_CLASS: Record<Direction, string> = {
  need: 'map-marker-need',
  offer: 'map-marker-offer',
  info: 'map-marker-info',
}

function divIcon(className: string) {
  return L.divIcon({
    className: '',
    html: `<div class="map-marker ${className}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
}

interface HomeMapProps {
  reports: Report[]
  acopios: AcopioCenter[]
  center: { lat: number; lng: number }
  showReports: boolean
  showAcopios: boolean
}

export default function HomeMap({
  reports,
  acopios,
  center,
  showReports,
  showAcopios,
}: HomeMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      className="h-96 w-full rounded-lg border border-slate-300"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {showReports &&
        reports.map((report) =>
          report.lat !== null && report.lng !== null ? (
            <Marker
              key={`report-${report.id}`}
              position={[report.lat, report.lng]}
              icon={divIcon(MARKER_CLASS[report.direction])}
            >
              <Popup>
                <span className="text-xs font-medium text-slate-500">
                  {DIRECTION_META[report.direction].label} · {report.city.name}
                </span>
                <p className="font-semibold">{report.title}</p>
                <Link to={`/reporte/${report.id}`}>
                  Ver detalles →
                </Link>
              </Popup>
            </Marker>
          ) : null,
        )}

      {showAcopios &&
        acopios.map((acopio) =>
          acopio.lat !== null && acopio.lng !== null ? (
            <Marker
              key={`acopio-${acopio.id}`}
              position={[acopio.lat, acopio.lng]}
              icon={divIcon('map-marker-acopio')}
            >
              <Popup>
                <span className="text-xs font-medium text-slate-500">
                  Centro de acopio
                </span>
                <p className="font-semibold">{acopio.name}</p>
                <Link to={`/centro/${acopio.id}`}>
                  Ver detalles →
                </Link>
              </Popup>
            </Marker>
          ) : null,
        )}
    </MapContainer>
  )
}