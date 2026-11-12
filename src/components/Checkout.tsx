import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ConnectKitButton } from 'connectkit'
import { erc20Abi } from 'viem'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { api } from '@/lib/api'
import { CHAIN_ID, CHAIN_NAME, USDC_ADDRESS, fmtDate, fmtUsdc, shortAddress, txUrl } from '@/lib/chain'
import { isUserRejection, parseOnchainError } from '@/lib/errors'
import { useUsdcBalance } from '@/hooks/useUsdcBalance'
import type { Invoice } from '@/lib/types'

type Phase = 'idle' | 'signing' | 'confirming'

function Receipt({ invoice }: { invoice: Invoice }) {
  return (
    <div className="mt-5 rounded-2xl p-4" style={{ background: 'rgba(26,128,71,0.08)' }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--success)' }}>
        <CheckCircle2 className="size-5" /> Payment received
      </div>
      <dl className="mt-3 space-y-1.5 text-xs" style={{ color: 'var(--muted)' }}>
        {invoice.payer && (
          <div className="flex justify-between">
            <dt>From</dt>
            <dd className="mono">{shortAddress(invoice.payer)}</dd>
          </div>
        )}
        {invoice.paidAt && (
          <div className="flex justify-between">
            <dt>When</dt>
            <dd>{fmtDate(invoice.paidAt)}</dd>
          </div>
        )}
      </dl>
      {invoice.txHash && (
        <a href={txUrl(invoice.txHash)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-8 items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent-hover)' }}>
          View on explorer <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  )
}

function PayPanel({ invoice }: { invoice: Invoice }) {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain, isPending: switching } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: CHAIN_ID })
  const queryClient = useQueryClient()
  const { data: balance } = useUsdcBalance(address)

  const [phase, setPhase] = useState<Phase>('idle')
  const [payError, setPayError] = useState<string | null>(null)
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null)

  const amount = BigInt(invoice.amount)
  const wrongChain = isConnected && chainId !== CHAIN_ID
  const insufficient = balance !== undefined && balance < amount

  const verify = useMutation({
    mutationFn: (txHash: `0x${string}`) => api.confirmPayment(invoice.id, { txHash }),
    onSuccess: async (paid) => {
      setPendingHash(null)
      queryClient.setQueryData(['invoice', invoice.id], paid)
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  const pay = async () => {
    if (!publicClient) return
    setPayError(null)
    setPhase('signing')
    try {
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [invoice.merchant, amount],
        chainId: CHAIN_ID,
      })
      setPendingHash(hash)
      setPhase('confirming')
      await publicClient.waitForTransactionReceipt({ hash })
      setPhase('idle')
      verify.mutate(hash)
    } catch (error) {
      setPhase('idle')
      if (!isUserRejection(error)) setPayError(parseOnchainError(error))
    }
  }

  const busy = phase !== 'idle' || verify.isPending

  let cta: React.ReactNode
  if (!isConnected) {
    cta = (
      <ConnectKitButton.Custom>
        {({ show }) => (
          <button type="button" onClick={show} className="btn-primary w-full rounded-2xl text-sm font-semibold">
            Connect wallet to pay
          </button>
        )}
      </ConnectKitButton.Custom>
    )
  } else if (wrongChain) {
    cta = (
      <button type="button" disabled={switching} onClick={() => switchChain({ chainId: CHAIN_ID })} className="btn-primary w-full rounded-2xl text-sm font-semibold">
        {switching ? 'Switching…' : `Switch to ${CHAIN_NAME}`}
      </button>
    )
  } else {
    cta = (
      <button type="button" disabled={busy || insufficient} onClick={() => void pay()} className="btn-primary w-full rounded-2xl text-sm font-semibold">
        {phase === 'signing' ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Confirm in wallet…
          </span>
        ) : phase === 'confirming' ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Confirming onchain…
          </span>
        ) : verify.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Verifying payment…
          </span>
        ) : insufficient ? (
          'Not enough USDC'
        ) : (
          `Pay $${fmtUsdc(amount)} USDC`
        )}
      </button>
    )
  }

  return (
    <>
      {isConnected && balance !== undefined && (
        <p className="mt-3 text-center text-xs tabular-nums" style={{ color: insufficient ? 'var(--danger)' : 'var(--muted)' }}>
          Your balance: ${fmtUsdc(balance)} USDC
          {insufficient && ' · use "Get test USDC" in the Arc Studio sidebar'}
        </p>
      )}
      <div className="mt-4">{cta}</div>

      {payError && (
        <p className="mt-3 flex items-start gap-2 text-sm" style={{ color: 'var(--danger)' }}>
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {payError}
        </p>
      )}

      {verify.isError && pendingHash && (
        <div className="mt-3 rounded-2xl p-3 text-sm" style={{ background: 'rgba(186,43,76,0.08)' }}>
          <p style={{ color: 'var(--danger)' }}>{verify.error.message}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            Your payment was sent. Verification can be retried safely.
          </p>
          <button type="button" disabled={verify.isPending} onClick={() => verify.mutate(pendingHash)} className="btn-ghost mt-2 w-full rounded-xl text-xs font-semibold">
            Retry verification
          </button>
        </div>
      )}
    </>
  )
}

export function Checkout({ id }: { id: string }) {
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.getInvoice(id),
    refetchInterval: (query) => (query.state.data?.status === 'paid' ? false : 5000),
    retry: false,
  })

  if (isLoading) {
    return <div className="card h-80 animate-pulse rounded-3xl" />
  }
  if (error || !invoice) {
    return (
      <section className="card rounded-3xl p-6 text-center">
        <h1 className="display text-2xl font-bold">Link not found</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          {error?.message ?? 'This payment link does not exist.'}
        </p>
      </section>
    )
  }

  const paid = invoice.status === 'paid'

  return (
    <section className="card overflow-hidden rounded-3xl">
      <div className="h-1" style={{ background: 'var(--spectral)' }} />
      <div className="p-6">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
          Pay <span className="mono normal-case tracking-normal">{shortAddress(invoice.merchant)}</span>
        </span>
        <p className="mt-1 text-pretty text-sm" style={{ color: 'var(--ink-2)' }}>
          {invoice.memo || 'USDC payment'}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <TokenUSDC variant="branded" size={36} />
          <span className="display text-5xl font-bold tabular-nums">${fmtUsdc(BigInt(invoice.amount))}</span>
          <span className="self-end pb-1.5 text-base font-medium" style={{ color: 'var(--subtle)' }}>
            USDC
          </span>
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
          Settles on {CHAIN_NAME}. Gas is paid in USDC, no other token needed.
        </p>

        {paid ? <Receipt invoice={invoice} /> : <PayPanel invoice={invoice} />}
      </div>
    </section>
  )
}
