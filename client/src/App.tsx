import { useEffect, useState } from 'react'

type Health = {
  status: string
  db: string
}

function App() {
  const [health, setHealth] = useState<Health | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [])

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">
        Wyndell's
      </h1>
      <p className="text-sm text-white/60">
        {health ? `API: ${health.status} · MongoDB: ${health.db}` : 'API: connecting…'}
      </p>
    </main>
  )
}

export default App