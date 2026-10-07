import { Outlet } from 'react-router-dom'
import { PublicFooter } from '@/components/common/Footer'
import { PublicNavbar } from '@/components/common/Navbar'
import { NewsletterPopup } from '@/features/newsletter/components'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      {/* Timed, once-per-session newsletter card for the whole public site. */}
      <NewsletterPopup />
    </div>
  )
}
