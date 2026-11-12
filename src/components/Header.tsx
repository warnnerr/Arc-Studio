import { ConnectKitButton } from 'connectkit'
import { TokenUSDC } from '@web3icons/react'
import { navigate } from '@/lib/nav'
import { CHAIN_NAME } from '@/lib/chain'

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 pt-5">
      <a
        href="/"
        onClick={(event) => {
          event.preventDefault()
          navigate('/')
        }}
        className="flex min-h-11 items-center gap-2"
      >
        <span className="flex size-8 items-center justify-center rounded-xl" style={{ background: 'var(--accent)' }}>
          <TokenUSDC variant="mono" size={18} color="#fff" />
        </span>
        <span className="display text-lg font-bold">Arc Pay</span>
      </a>
      <div className="flex items-center gap-2">
        <span className="hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
          {CHAIN_NAME}
        </span>
        <ConnectKitButton showBalance={false} />
      </div>
    </header>
  )
}
