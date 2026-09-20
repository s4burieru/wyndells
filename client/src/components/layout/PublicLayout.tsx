import { Outlet } from 'react-router-dom'
import { PublicFooter } from '@/components/common/Footer'
import { PublicNavbar } from '@/components/common/Navbar'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}