import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import CreateAvisoPage from './pages/CreateAvisoPage'
import CreateOfferPage from './pages/CreateOfferPage'
import CreateRequestPage from './pages/CreateRequestPage'
import HelpOrgDetailPage from './pages/HelpOrgDetailPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MyOrgPage from './pages/MyOrgPage'
import NewOrgPage from './pages/NewOrgPage'
import RedDeAyudasPage from './pages/RedDeAyudasPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import AvisoDetailPage from './pages/AvisoDetailPage'
import OfferDetailPage from './pages/OfferDetailPage'
import RequestDetailPage from './pages/RequestDetailPage'
import TransportHubPage from './pages/TransportHubPage'

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
            <Route path="/transporte" element={<TransportHubPage />} />
            <Route path="/informar" element={<CreateAvisoPage />} />
            <Route path="/pedido/:id" element={<RequestDetailPage />} />
            <Route path="/oferta/:id" element={<OfferDetailPage />} />
            <Route path="/aviso/:id" element={<AvisoDetailPage />} />
            <Route path="/nuevo-centro" element={<NewOrgPage />} />
            <Route path="/red-de-ayudas" element={<RedDeAyudasPage />} />
            <Route path="/organizacion/:id" element={<HelpOrgDetailPage />} />
            <Route path="/iniciar-sesion" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/verificar-correo" element={<VerifyEmailPage />} />
            <Route path="/mi-organizacion" element={<MyOrgPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
