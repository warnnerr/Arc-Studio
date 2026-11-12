import { createPublicClient, erc20Abi, http, isAddressEqual, parseEventLogs } from 'viem'
import { arcTestnet } from 'viem/chains'
import { getUsdc, requireChain } from '../src/onchain-facts'
import type { Invoice } from '../src/lib/types'

/** Chain the checkout settles on. */
export const CHAIN_ID = arcTestnet.id
const REGISTRY_KEY = 'Arc_Testnet'

export class VerifyError extends Error {}

function resolveRpcUrl(): string {
  const direct = process.env[`RPC_URL_${REGISTRY_KEY}`]
  if (direct) return direct
  const base = process.env.RPC_PROXY_BASE_URL
  const token = process.env.RPC_PROXY_TOKEN
  const proxied = (process.env.RPC_PROXY_CHAINS ?? '').split(',')
  if (base && token && proxied.includes(REGISTRY_KEY)) {
    return `${base}/api/rpc/${REGISTRY_KEY}?_rpc_token=${token}`
  }
  return requireChain(CHAIN_ID).rpcUrls[0]
}

const client = createPublicClient({ chain: arcTestnet, transport: http(resolveRpcUrl()) })

const usdc = getUsdc(CHAIN_ID)
if (!usdc) throw new Error('USDC is not registered for the settlement chain')
const USDC_ADDRESS = usdc.address as `0x${string}`

/** Allowed clock drift between the invoice and a block timestamp. */
const CLOCK_SKEW_MS = 60_000

export async function verifyPayment(
  invoice: Invoice,
  txHash: `0x${string}`,
): Promise<{ payer: `0x${string}` }> {
  let receipt
  try {
    receipt = await client.waitForTransactionReceipt({ hash: txHash, timeout: 25_000 })
  } catch {
    throw new VerifyError('Transaction not found yet. Try again in a few seconds.')
  }
  if (receipt.status !== 'success') throw new VerifyError('That transaction reverted onchain.')

  const transfers = parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: receipt.logs }).filter((log) =>
    isAddressEqual(log.address, USDC_ADDRESS),
  )
  const required = BigInt(invoice.amount)
  const match = transfers.find((log) => isAddressEqual(log.args.to, invoice.merchant) && log.args.value >= required)
  if (!match) throw new VerifyError('No USDC transfer to the merchant for this amount in that transaction.')

  const block = await client.getBlock({ blockNumber: receipt.blockNumber })
  if (Number(block.timestamp) * 1000 + CLOCK_SKEW_MS < invoice.createdAt) {
    throw new VerifyError('That payment happened before this invoice was created.')
  }
  return { payer: match.args.from }
}
