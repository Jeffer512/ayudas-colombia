import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AdminPage from './pages/AdminPage'
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
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AvisoDetailPage from './pages/AvisoDetailPage'
import ChatPage from './pages/ChatPage'
import OfferDetailPage from './pages/OfferDetailPage'
import OfferEditPage from './pages/OfferEditPage'
import RequestDetailPage from './pages/RequestDetailPage'
import RequestEditPage from './pages/RequestEditPage'
import TransportHubPage from './pages/TransportHubPage'
import AccountPage from './pages/AccountPage'
import SeoHead from './seo/SeoHead'

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
        <SeoHead />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/pedir-ayuda" element={<CreateRequestPage />} />
            <Route path="/ofrecer-ayuda" element={<CreateOfferPage />} />
            <Route path="/transporte" element={<TransportHubPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/informar" element={<CreateAvisoPage />} />
            <Route path="/pedido/:id" element={<RequestDetailPage />} />
            <Route path="/pedido/:id/editar" element={<RequestEditPage />} />
            <Route path="/oferta/:id" element={<OfferDetailPage />} />
            <Route path="/oferta/:id/editar" element={<OfferEditPage />} />
            <Route path="/aviso/:id" element={<AvisoDetailPage />} />
            <Route path="/nuevo-centro" element={<NewOrgPage />} />
            <Route path="/red-de-ayudas" element={<RedDeAyudasPage />} />
            <Route path="/organizacion/:id" element={<HelpOrgDetailPage />} />
            <Route path="/iniciar-sesion" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/verificar-correo" element={<VerifyEmailPage />} />
            <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
            <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
            <Route path="/mi-organizacion" element={<MyOrgPage />} />
            <Route path="/cuenta" element={<AccountPage />} />
          </Route>
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
