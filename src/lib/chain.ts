import { arcTestnet } from 'viem/chains'
import { buildAddressExplorerUrl, buildTxExplorerUrl, getUsdc, requireChain } from '@/onchain-facts'
import { formatUsdc } from '@/onchain-money'

export const CHAIN_ID = arcTestnet.id
export const CHAIN_NAME = requireChain(CHAIN_ID).name

const usdc = getUsdc(CHAIN_ID)
if (!usdc) throw new Error('USDC is not registered for Arc Testnet')
export const USDC_ADDRESS = usdc.address as `0x${string}`

export const txUrl = (hash: string) => buildTxExplorerUrl(CHAIN_ID, hash)
export const addressUrl = (address: string) => buildAddressExplorerUrl(CHAIN_ID, address)

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

/** Formats USDC base units with thousands separators and at least two decimals. */
export function fmtUsdc(raw: bigint): string {
  const [whole, fraction = ''] = formatUsdc(raw).split('.')
  const grouped = BigInt(whole).toLocaleString('en-US')
  return `${grouped}.${fraction.padEnd(2, '0')}`
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
