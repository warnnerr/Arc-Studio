import { useMemo } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { TokenUSDC } from '@web3icons/react'
import { CHAIN_NAME, fmtUsdc, shortAddress } from '@/lib/chain'
import { useMerchantInvoices } from '@/hooks/useMerchantInvoices'
import { CreateInvoice } from './CreateInvoice'
import { InvoiceList } from './InvoiceList'

function ConnectPrompt() {
  return (
    <section className="card rounded-3xl p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl" style={{ background: 'var(--surface-muted)' }}>
        <TokenUSDC variant="branded" size={28} />
      </div>
      <h1 className="display mt-4 text-3xl font-bold text-balance">Get paid in USDC</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        Connect your wallet, create a payment link, and share it. Payments land in your wallet and are verified onchain on {CHAIN_NAME}.
      </p>
      <div className="mt-5 flex justify-center">
        <ConnectKitButton.Custom>
          {({ show }) => (
            <button type="button" onClick={show} className="btn-primary rounded-2xl px-6 text-sm font-semibold">
              Connect wallet
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>
    </section>
  )
}

export function Dashboard() {
  const { address, isConnected } = useAccount()
  const { data: invoices, isLoading, isError } = useMerchantInvoices(address)

  const totals = useMemo(() => {
    const paid = (invoices ?? []).filter((invoice) => invoice.status === 'paid')
    const received = paid.reduce((sum, invoice) => sum + BigInt(invoice.amount), 0n)
    return { received, paidCount: paid.length, pendingCount: (invoices?.length ?? 0) - paid.length }
  }, [invoices])

  if (!isConnected || !address) return <ConnectPrompt />

  return (
    <div className="space-y-4">
      <section className="card rounded-3xl p-5">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
          Received via Arc Pay
        </span>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="display text-5xl font-bold tabular-nums">{isLoading ? '…' : `$${fmtUsdc(totals.received)}`}</span>
          <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>
            USDC
          </span>
        </div>
        <p className="mt-1.5 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
          {totals.paidCount} paid, {totals.pendingCount} awaiting · paying out to <span className="mono">{shortAddress(address)}</span>
        </p>
      </section>

      {isError && (
        <p className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(186,43,76,0.08)', color: 'var(--danger)' }}>
          Cannot reach the payments server. Retrying…
        </p>
      )}

      <CreateInvoice merchant={address} />
      <InvoiceList invoices={invoices} loading={isLoading} />
    </div>
  )
}
