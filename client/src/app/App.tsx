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
import { ManagePromotionsPage } from '@/pages/dashboard/PromotionsPage'
import { ManageCustomersPage } from '@/pages/dashboard/CustomersPage'
import { ManageApplicationsPage } from '@/pages/dashboard/ApplicationsPage'
import { ReportsPage } from '@/pages/dashboard/ReportsPage'
import { ManageBranchesPage } from '@/pages/dashboard/BranchesPage'
import { ManageUsersPage } from '@/pages/dashboard/UsersPage'
import { ActivityPage } from '@/pages/dashboard/ActivityPage'
import { RolesPermissionsPage } from '@/pages/dashboard/RolesPermissionsPage'
import { ChatPage } from '@/pages/dashboard/ChatPage'
import { StaffDirectoryPage } from '@/pages/dashboard/StaffDirectoryPage'
import { StaffProfilePage } from '@/pages/dashboard/StaffProfilePage'

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
              {/* The landing page stays ungated so a revoked permission can
                  never bounce the browser between routes. */}
              <Route path="/staff" element={<DashboardOverviewPage />} />
              <Route element={<RequireAuth permission="reservations.manage" />}>
                <Route path="/staff/reservations" element={<ManageReservationsPage />} />
              </Route>
              <Route element={<RequireAuth permission="tables.manage" />}>
                <Route path="/staff/tables" element={<ManageTablesPage />} />
              </Route>
              <Route element={<RequireAuth permission="menu.manage" />}>
                <Route path="/staff/menu" element={<ManageMenuPage />} />
              </Route>
              <Route element={<RequireAuth permission="feedback.view" />}>
                <Route path="/staff/feedback" element={<ManageFeedbackPage />} />
              </Route>
              <Route element={<RequireAuth permission="promotions.manage" />}>
                <Route path="/staff/promotions" element={<ManagePromotionsPage />} />
              </Route>
              <Route element={<RequireAuth permission="customers.view" />}>
                <Route path="/staff/customers" element={<ManageCustomersPage />} />
              </Route>
              <Route element={<RequireAuth permission="careers.manage" />}>
                <Route path="/staff/applications" element={<ManageApplicationsPage />} />
              </Route>
              <Route element={<RequireAuth permission="reports.view" />}>
                <Route path="/staff/reports" element={<ReportsPage />} />
              </Route>
              <Route element={<RequireAuth permission="chat.use" />}>
                <Route path="/staff/chat" element={<ChatPage />} />
              </Route>
              <Route element={<RequireAuth permission="directory.view" />}>
                <Route path="/staff/directory" element={<StaffDirectoryPage />} />
              </Route>
              <Route path="/staff/profile/:id" element={<StaffProfilePage />} />
              <Route element={<RequireAuth permission="branches.manage" />}>
                <Route path="/staff/branches" element={<ManageBranchesPage />} />
              </Route>
              <Route element={<RequireAuth permission="users.view" />}>
                <Route path="/staff/users" element={<ManageUsersPage />} />
              </Route>
              <Route element={<RequireAuth permission="activity.view" />}>
                <Route path="/staff/activity" element={<ActivityPage />} />
              </Route>
              <Route element={<RequireAuth permission="roles.manage" />}>
                <Route path="/staff/settings/roles" element={<RolesPermissionsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
