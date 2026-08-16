export interface SeedCity {
  code: string
  name: string
  department: string
  centerLat: number
  centerLng: number
}

export const cities: SeedCity[] = [
  { code: 'pereira', name: 'Pereira', department: 'Risaralda', centerLat: 4.8133, centerLng: -75.6961 },
  { code: 'dosquebradas', name: 'Dosquebradas', department: 'Risaralda', centerLat: 4.839, centerLng: -75.6762 },
  { code: 'manizales', name: 'Manizales', department: 'Caldas', centerLat: 5.0703, centerLng: -75.5138 },
  { code: 'armenia', name: 'Armenia', department: 'Quindío', centerLat: 4.5339, centerLng: -75.6811 },
  { code: 'cartago', name: 'Cartago', department: 'Valle del Cauca', centerLat: 4.7464, centerLng: -75.9117 },
  { code: 'cali', name: 'Cali', department: 'Valle del Cauca', centerLat: 3.4516, centerLng: -76.532 },
  { code: 'buenaventura', name: 'Buenaventura', department: 'Valle del Cauca', centerLat: 3.8801, centerLng: -77.0312 },
  { code: 'san-jose-del-palmar', name: 'San José del Palmar', department: 'Chocó', centerLat: 4.4236, centerLng: -76.2331 },
  { code: 'quibdo', name: 'Quibdó', department: 'Chocó', centerLat: 5.6947, centerLng: -76.6611 },
]