import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { MARKER_COLORS } from '../lib/constants'
import type { AcopioCenter, Aviso, Offer, Request } from '../lib/types'
import { L } from './leaflet'

function divIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div class="map-marker" style="background-color:${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
}

interface HomeMapProps {
  requests: Request[]
  offers: Offer[]
  avisos: Aviso[]
  acopios: AcopioCenter[]
  center: { lat: number; lng: number }
  showNeeds: boolean
  showOffers: boolean
  showAvisos: boolean
  showAcopios: boolean
}

export default function HomeMap({
  requests,
  offers,
  avisos,
  acopios,
  center,
  showNeeds,
  showOffers,
  showAvisos,
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

      {showNeeds &&
        requests.map((request) =>
          request.lat !== null && request.lng !== null ? (
            <Marker
              key={`request-${request.id}`}
              position={[request.lat, request.lng]}
              icon={divIcon(MARKER_COLORS.needs)}
            >
              <Popup>
                <span className="text-xs font-medium text-slate-500">
                  Pedido · {request.city.name}
                </span>
                <p className="font-semibold">{request.title}</p>
                <Link to={`/pedido/${request.id}`}>Ver detalles →</Link>
              </Popup>
            </Marker>
          ) : null,
        )}

      {showOffers &&
        offers.map((offer) =>
          offer.lat !== null && offer.lng !== null ? (
            <Marker
              key={`offer-${offer.id}`}
              position={[offer.lat, offer.lng]}
              icon={divIcon(MARKER_COLORS.offers)}
            >
              <Popup>
                <span className="text-xs font-medium text-slate-500">
                  Oferta · {offer.city.name}
                </span>
                <p className="font-semibold">{offer.title}</p>
                <Link to={`/oferta/${offer.id}`}>Ver detalles →</Link>
              </Popup>
            </Marker>
          ) : null,
        )}

      {showAvisos &&
        avisos.map((aviso) =>
          aviso.lat !== null && aviso.lng !== null ? (
            <Marker
              key={`aviso-${aviso.id}`}
              position={[aviso.lat, aviso.lng]}
              icon={divIcon(MARKER_COLORS.avisos)}
            >
              <Popup>
                <span className="text-xs font-medium text-slate-500">
                  Aviso · {aviso.city.name}
                </span>
                <p className="font-semibold">{aviso.title}</p>
                <Link to={`/aviso/${aviso.id}`}>Ver detalles →</Link>
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
              icon={divIcon(MARKER_COLORS.acopios)}
            >
              <Popup>
                <span className="text-xs font-medium text-slate-500">
                  Centro de acopio
                </span>
                <p className="font-semibold">{acopio.name}</p>
                <Link to={`/centro/${acopio.id}`}>Ver detalles →</Link>
              </Popup>
            </Marker>
          ) : null,
        )}
    </MapContainer>
  )
}