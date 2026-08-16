import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { HELP_ORG_CATEGORY_LABELS, MARKER_COLORS } from '../lib/constants'
import type { Aviso, HelpOrg, Offer, Request } from '../lib/types'
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

function MapFollower({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap()
  const [initial, setInitial] = useState(true)
  useEffect(() => {
    if (initial) {
      setInitial(false)
      return
    }
    map.flyTo([center.lat, center.lng], map.getZoom())
  }, [map, initial, center.lat, center.lng])
  return null
}

interface HomeMapProps {
  requests: Request[]
  offers: Offer[]
  avisos: Aviso[]
  helpOrgs: HelpOrg[]
  center: { lat: number; lng: number }
  showNeeds: boolean
  showOffers: boolean
  showAvisos: boolean
  showOrgs: boolean
}

export default function HomeMap({
  requests,
  offers,
  avisos,
  helpOrgs,
  center,
  showNeeds,
  showOffers,
  showAvisos,
  showOrgs,
}: HomeMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      className="h-96 w-full rounded-lg border border-line"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapFollower center={center} />

      {showNeeds &&
        requests.map((request) =>
          request.lat !== null && request.lng !== null ? (
            <Marker
              key={`request-${request.id}`}
              position={[request.lat, request.lng]}
              icon={divIcon(MARKER_COLORS.needs)}
            >
              <Popup>
                <span className="text-xs font-medium text-text-muted">
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
                <span className="text-xs font-medium text-text-muted">
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
                <span className="text-xs font-medium text-text-muted">
                  Aviso · {aviso.city.name}
                </span>
                <p className="font-semibold">{aviso.title}</p>
                <Link to={`/aviso/${aviso.id}`}>Ver detalles →</Link>
              </Popup>
            </Marker>
          ) : null,
        )}

      {showOrgs &&
        helpOrgs.map((org) =>
          org.lat !== null && org.lng !== null ? (
            <Marker
              key={`org-${org.id}`}
              position={[org.lat, org.lng]}
              icon={divIcon(MARKER_COLORS.helpOrgs)}
            >
              <Popup>
                <span className="text-xs font-medium text-text-muted">
                  {HELP_ORG_CATEGORY_LABELS[org.category] ?? org.category} · {org.city.name}
                </span>
                <p className="font-semibold">{org.name}</p>
                <Link to={`/organizacion/${org.id}`}>Ver detalles →</Link>
              </Popup>
            </Marker>
          ) : null,
        )}
    </MapContainer>
  )
}