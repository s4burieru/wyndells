import { useEffect, useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'

/**
 * A dish photo that fills its container, falling back to the branded
 * placeholder when the menu item has no image (or its link stops loading).
 * Pair with an aspect-ratio class on the wrapper so cards stay aligned.
 */
export function MenuItemImage({
  src,
  alt,
  className = '',
}: {
  src?: string
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  // A reused element (new src) should retry instead of staying broken.
  useEffect(() => setFailed(false), [src])

  const showImage = Boolean(src) && !failed
  return (
    <div className={`relative overflow-hidden bg-wyndell-cream ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center" aria-hidden>
          <UtensilsCrossed className="size-8 text-wyndell-orange-dark/70" />
        </div>
      )}
    </div>
  )
}
