import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import type { Invoice } from '../src/lib/types'

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data')
const DATA_FILE = path.join(DATA_DIR, 'invoices.json')

let cache: Map<string, Invoice> | null = null
let saveChain: Promise<void> = Promise.resolve()

async function load(): Promise<Map<string, Invoice>> {
  if (cache) return cache
  try {
    const raw = await readFile(DATA_FILE, 'utf8')
    const rows = JSON.parse(raw) as Invoice[]
    cache = new Map(rows.map((row) => [row.id, row]))
  } catch {
    cache = new Map()
  }
  return cache
}

/** Serialises writes and swaps the file atomically so a crash never leaves half a file. */
function persist(map: Map<string, Invoice>): Promise<void> {
  const snapshot = JSON.stringify([...map.values()], null, 2)
  saveChain = saveChain
    .then(async () => {
      await mkdir(DATA_DIR, { recursive: true })
      const tmp = `${DATA_FILE}.${process.pid}.tmp`
      await writeFile(tmp, snapshot, 'utf8')
      await rename(tmp, DATA_FILE)
    })
    .catch((error: unknown) => {
      console.error('failed to persist invoices', error instanceof Error ? error.message : 'unknown error')
    })
  return saveChain
}

export async function listInvoices(merchant?: string): Promise<Invoice[]> {
  const map = await load()
  const rows = [...map.values()]
  const filtered = merchant ? rows.filter((row) => row.merchant.toLowerCase() === merchant.toLowerCase()) : rows
  return filtered.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  return (await load()).get(id)
}

export async function createInvoice(input: Pick<Invoice, 'merchant' | 'amount' | 'memo'>): Promise<Invoice> {
  const map = await load()
  const invoice: Invoice = {
    id: randomBytes(6).toString('hex'),
    merchant: input.merchant,
    amount: input.amount,
    memo: input.memo,
    createdAt: Date.now(),
    status: 'pending',
  }
  map.set(invoice.id, invoice)
  await persist(map)
  return invoice
}

export async function isTxUsed(txHash: string): Promise<boolean> {
  const map = await load()
  const wanted = txHash.toLowerCase()
  return [...map.values()].some((row) => row.txHash?.toLowerCase() === wanted)
}

/**
 * Marks an invoice paid. The status check and the write happen in the same
 * synchronous step, so two concurrent confirmations can never both win.
 */
export async function markPaid(
  id: string,
  payment: { payer: `0x${string}`; txHash: `0x${string}` },
): Promise<Invoice | undefined> {
  const map = await load()
  const current = map.get(id)
  if (!current || current.status === 'paid') return undefined
  const txUsed = [...map.values()].some((row) => row.txHash?.toLowerCase() === payment.txHash.toLowerCase())
  if (txUsed) return undefined
  const paid: Invoice = { ...current, status: 'paid', payer: payment.payer, txHash: payment.txHash, paidAt: Date.now() }
  map.set(id, paid)
  await persist(map)
  return paid
}
