import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AcopioDetailPage from './pages/AcopioDetailPage'
import AcopiosPage from './pages/AcopiosPage'
import CreateReportPage from './pages/CreateReportPage'
import HomePage from './pages/HomePage'
import NewCenterPage from './pages/NewCenterPage'
import ReportDetailPage from './pages/ReportDetailPage'
import type { Direction } from './lib/types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
})

const reportRoutes: { path: string; direction: Direction }[] = [
  { path: '/pedir-ayuda', direction: 'need' },
  { path: '/ofrecer-ayuda', direction: 'offer' },
  { path: '/informar', direction: 'info' },
]

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            {reportRoutes.map(({ path, direction }) => (
              <Route
                key={path}
                path={path}
                element={<CreateReportPage direction={direction} />}
              />
            ))}
            <Route path="/reporte/:id" element={<ReportDetailPage />} />
            <Route path="/nuevo-centro" element={<NewCenterPage />} />
            <Route path="/centros-de-acopio" element={<AcopiosPage />} />
            <Route path="/centro/:id" element={<AcopioDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}