import { Link } from 'react-router-dom'

/**
 * A restrained leaf-and-sun mark in Wyndell's brand colors. Not a recreation
 * of the official logo — a small internal brand mark used in the app chrome.
 */
export function BrandMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <span className={['inline-flex shrink-0 items-center justify-center rounded-full bg-wyndell-orange/10 p-1', className].join(' ')}>
      <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
        <circle cx="20" cy="20" r="15" fill="none" stroke="#F58000" strokeWidth="2.4" />
        <circle cx="20" cy="14.5" r="4.2" fill="#f9c515" />
        <path
          d="M14.5 22.5 Q11 25 6.5 24 Q4.5 20.5 6.5 17 Q10 15.5 14.5 17.5 Z"
          fill="#168b48"
        />
        <path
          d="M25.5 22.5 Q29 25 33.5 24 Q35.5 20.5 33.5 17 Q30 15.5 25.5 17.5 Z"
          fill="#3db85a"
        />
      </svg>
    </span>
  )
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`font-display text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-wyndell-forest'}`}>
      Wyndell&rsquo;s
    </span>
  )
}

/** The official logo file, copied into client/public/logos. */
const BRAND_LOGO_SRC = '/logos/wyndells-main-logo.png'

/**
 * The official Wyndell's logo — mark and wordmark baked into one image. Its
 * orange-and-yellow artwork reads well on both the light navbar and the dark
 * footer, so a single image serves every placement.
 */
export function BrandLogo({
  to = '/',
  className = 'h-12 w-auto',
}: {
  to?: string
  className?: string
}) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center">
      <img src={BRAND_LOGO_SRC} alt="Wyndell's" className={className} />
    </Link>
  )
}