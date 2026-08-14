import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AcopioDetailPage from './pages/AcopioDetailPage'
import AcopiosPage from './pages/AcopiosPage'
import CreateAvisoPage from './pages/CreateAvisoPage'
import CreateOfferPage from './pages/CreateOfferPage'
import CreateRequestPage from './pages/CreateRequestPage'
import HomePage from './pages/HomePage'
import NewCenterPage from './pages/NewCenterPage'
import AvisoDetailPage from './pages/AvisoDetailPage'
import OfferDetailPage from './pages/OfferDetailPage'
import RequestDetailPage from './pages/RequestDetailPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/pedir-ayuda" element={<CreateRequestPage />} />
            <Route path="/ofrecer-ayuda" element={<CreateOfferPage />} />
            <Route path="/informar" element={<CreateAvisoPage />} />
            <Route path="/pedido/:id" element={<RequestDetailPage />} />
            <Route path="/oferta/:id" element={<OfferDetailPage />} />
            <Route path="/aviso/:id" element={<AvisoDetailPage />} />
            <Route path="/nuevo-centro" element={<NewCenterPage />} />
            <Route path="/centros-de-acopio" element={<AcopiosPage />} />
            <Route path="/centro/:id" element={<AcopioDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
