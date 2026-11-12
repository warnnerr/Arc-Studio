import { Header } from '@/components/Header'
import { Dashboard } from '@/components/Dashboard'
import { Checkout } from '@/components/Checkout'
import { matchPayId, usePath } from '@/lib/nav'

export default function App() {
  const path = usePath()
  const payId = matchPayId(path)

  return (
    <div className="min-h-dvh pb-24">
      <Header />
      <main className="mx-auto w-full max-w-xl px-4 pt-6">{payId ? <Checkout key={payId} id={payId} /> : <Dashboard />}</main>
    </div>
  )
}
