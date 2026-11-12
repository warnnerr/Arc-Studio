import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { TokenUSDC } from '@web3icons/react'
import { api } from '@/lib/api'
import { parseUsdc } from '@/onchain-money'
import { MAX_INVOICE_USDC, MAX_MEMO_LENGTH } from '@/lib/types'
import { merchantInvoicesKey } from '@/hooks/useMerchantInvoices'

const QUICK_AMOUNTS = ['0.10', '0.50', '1.00', '5.00']

function isValidAmount(value: string): boolean {
  if (!/^\d+(\.\d{1,6})?$/.test(value)) return false
  try {
    const units = parseUsdc(value)
    return units > 0n && units <= parseUsdc(MAX_INVOICE_USDC)
  } catch {
    return false
  }
}

export function CreateInvoice({ merchant }: { merchant: `0x${string}` }) {
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: () => api.createInvoice({ merchant, amount, memo }),
    onSuccess: async () => {
      setAmount('')
      setMemo('')
      toast.success('Payment link created')
      await queryClient.invalidateQueries({ queryKey: merchantInvoicesKey(merchant) })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const valid = isValidAmount(amount)

  return (
    <section className="card rounded-3xl p-5">
      <h2 className="display text-lg font-semibold">New payment link</h2>
      <p className="mt-0.5 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        Customers pay USDC straight to your wallet. Each link settles once.
      </p>

      <div className="field mt-4 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <TokenUSDC variant="branded" size={28} />
          <input
            inputMode="decimal"
            aria-label="Amount in USDC"
            value={amount}
            onChange={(event) => {
              const value = event.target.value.replace(/[^0-9.]/g, '')
              if (/^\d*\.?\d{0,6}$/.test(value)) setAmount(value)
            }}
            placeholder="0.00"
            className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-300"
          />
          <span className="text-sm font-medium" style={{ color: 'var(--subtle)' }}>
            USDC
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => setAmount(quick)}
              className="btn-ghost rounded-full px-3 text-xs font-semibold tabular-nums"
            >
              ${quick}
            </button>
          ))}
        </div>
      </div>

      <label className="field mt-3 block rounded-2xl px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
          What is it for?
        </span>
        <input
          value={memo}
          maxLength={MAX_MEMO_LENGTH}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="Design review, order #1042…"
          className="mt-1 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </label>

      <button
        type="button"
        disabled={!valid || create.isPending}
        onClick={() => create.mutate()}
        className="btn-primary mt-4 w-full rounded-2xl text-sm font-semibold"
      >
        {create.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Creating…
          </span>
        ) : (
          'Create payment link'
        )}
      </button>
    </section>
  )
}
