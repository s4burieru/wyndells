import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { RequireAuth } from '@/components/auth/RequireAuth'

import { HomePage } from '@/pages/public/HomePage'
import { MenuPage } from '@/pages/public/MenuPage'
import { BranchesPage } from '@/pages/public/BranchesPage'
import { BranchDetailPage } from '@/pages/public/BranchDetailPage'
import { ReservePage } from '@/pages/public/ReservePage'
import { CheckReservationPage } from '@/pages/public/CheckReservationPage'
import { FeedbackPage } from '@/pages/public/FeedbackPage'
import { CareersPage } from '@/pages/public/CareersPage'
import { ContactPage } from '@/pages/public/ContactPage'

import { StaffLoginPage } from '@/features/auth/LoginPage'
import { DashboardOverviewPage } from '@/pages/dashboard/OverviewPage'
import { ManageReservationsPage } from '@/pages/dashboard/ReservationsPage'
import { ManageTablesPage } from '@/pages/dashboard/TablesPage'
import { ManageMenuPage } from '@/pages/dashboard/MenuPage'
import { ManageFeedbackPage } from '@/pages/dashboard/FeedbackPage'
import { ManageApplicationsPage } from '@/pages/dashboard/ApplicationsPage'
import { ReportsPage } from '@/pages/dashboard/ReportsPage'
import { ManageBranchesPage } from '@/pages/dashboard/BranchesPage'
import { ManageUsersPage } from '@/pages/dashboard/UsersPage'

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