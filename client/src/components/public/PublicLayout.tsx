import { Outlet } from 'react-router-dom'
import { PublicFooter } from './Footer'
import { PublicNavbar } from './Navbar'

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