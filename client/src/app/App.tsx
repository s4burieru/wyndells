import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { Toaster } from '@/components/ui/sonner'
import { PublicLayout } from './components/public/PublicLayout'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { RequireAuth } from './components/RequireAuth'

import { HomePage } from './pages/public/Home'
import { MenuPage } from './pages/public/Menu'
import { BranchesPage } from './pages/public/Branches'
import { BranchDetailPage } from './pages/public/BranchDetail'
import { ReservePage } from './pages/public/Reserve'
import { CheckReservationPage } from './pages/public/CheckReservation'
import { FeedbackPage } from './pages/public/Feedback'
import { CareersPage } from './pages/public/Careers'
import { ContactPage } from './pages/public/Contact'

import { StaffLoginPage } from './pages/auth/Login'
import { DashboardOverviewPage } from './pages/dashboard/Overview'
import { ManageReservationsPage } from './pages/dashboard/Reservations'
import { ManageTablesPage } from './pages/dashboard/Tables'
import { ManageMenuPage } from './pages/dashboard/Menu'
import { ManageFeedbackPage } from './pages/dashboard/Feedback'
import { ManageApplicationsPage } from './pages/dashboard/Applications'
import { ReportsPage } from './pages/dashboard/Reports'
import { ManageBranchesPage } from './pages/dashboard/Branches'
import { ManageUsersPage } from './pages/dashboard/Users'

function App() {
  return (
    <AuthProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/branches/:code" element={<BranchDetailPage />} />
            <Route path="/reserve" element={<ReservePage />} />
            <Route path="/check" element={<CheckReservationPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Route>

          <Route path="/staff/login" element={<StaffLoginPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<DashboardLayout />}>
              <Route path="/staff" element={<DashboardOverviewPage />} />
              <Route path="/staff/reservations" element={<ManageReservationsPage />} />
              <Route path="/staff/tables" element={<ManageTablesPage />} />
              <Route path="/staff/menu" element={<ManageMenuPage />} />
              <Route path="/staff/feedback" element={<ManageFeedbackPage />} />
              <Route path="/staff/applications" element={<ManageApplicationsPage />} />
              <Route path="/staff/reports" element={<ReportsPage />} />
              <Route element={<RequireAuth role="admin" />}>
                <Route path="/staff/branches" element={<ManageBranchesPage />} />
                <Route path="/staff/users" element={<ManageUsersPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App