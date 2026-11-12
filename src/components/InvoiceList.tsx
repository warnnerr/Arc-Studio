import { Check, Copy, ExternalLink, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import type { Invoice } from '@/lib/types'
import { fmtDate, fmtUsdc, shortAddress, txUrl } from '@/lib/chain'
import { navigate } from '@/lib/nav'
import { useShareLink } from '@/hooks/useShareLink'

function StatusPill({ status }: { status: Invoice['status'] }) {
  const paid = status === 'paid'
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{
        background: paid ? 'rgba(26,128,71,0.12)' : 'var(--surface-muted)',
        color: paid ? 'var(--success)' : 'var(--muted)',
      }}
    >
      {paid && <Check className="size-3" />}
      {paid ? 'Paid' : 'Awaiting payment'}
    </span>
  )
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const link = useShareLink(invoice.id)

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.')
    }
  }

  return (
    <li className="rounded-2xl p-4" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{invoice.memo || `Invoice ${invoice.id.slice(0, 6)}`}</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--subtle)' }}>
            {invoice.status === 'paid' && invoice.paidAt ? `Paid ${fmtDate(invoice.paidAt)}` : `Created ${fmtDate(invoice.createdAt)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="display text-lg font-bold tabular-nums">${fmtUsdc(BigInt(invoice.amount))}</p>
          <StatusPill status={invoice.status} />
        </div>
      </div>

      {invoice.status === 'paid' && invoice.txHash && invoice.payer ? (
        <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
          <span className="mono">from {shortAddress(invoice.payer)}</span>
          <a href={txUrl(invoice.txHash)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 font-semibold" style={{ color: 'var(--accent-hover)' }}>
            View on explorer <ExternalLink className="size-3" />
          </a>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={!link} onClick={() => void copy()} className="btn-ghost flex flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold disabled:opacity-40">
            <Copy className="size-3.5" /> Copy link
          </button>
          <a
            href={`/pay/${invoice.id}`}
            onClick={(event) => {
              event.preventDefault()
              navigate(`/pay/${invoice.id}`)
            }}
            className="btn-ghost flex flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold"
          >
            <Receipt className="size-3.5" /> Open checkout
          </a>
        </div>
      )}
    </li>
  )
}

export function InvoiceList({ invoices, loading }: { invoices: Invoice[] | undefined; loading: boolean }) {
  return (
    <section className="card rounded-3xl p-5">
      <h2 className="display text-lg font-semibold">Payment links</h2>
      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1].map((key) => (
            <div key={key} className="h-24 animate-pulse rounded-2xl" style={{ background: 'var(--surface-muted)' }} />
          ))}
        </div>
      ) : invoices && invoices.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {invoices.map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
          Nothing here yet. Create your first link above and share it with a customer.
        </p>
      )}
    </section>
  )
}
