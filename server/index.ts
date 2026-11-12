import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { getAddress, isAddress, isHash } from 'viem'
import { formatUsdc, parseUsdc } from '../src/onchain-money'
import { MAX_INVOICE_USDC, MAX_MEMO_LENGTH, type ConfirmBody, type CreateInvoiceBody } from '../src/lib/types'
import { createInvoice, getInvoice, isTxUsed, listInvoices, markPaid } from './store'
import { VerifyError, verifyPayment } from './verify'

const PORT = Number(process.env.PORT ?? 3001)
const MAX_BODY_BYTES = 8 * 1024
const MAX_INVOICES_PER_MERCHANT = 200
const MAX_AMOUNT = parseUsdc(MAX_INVOICE_USDC)

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    size += buf.length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request body too large')
    chunks.push(buf)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new HttpError(400, 'Body must be valid JSON')
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new HttpError(400, 'Expected a JSON object')
  return value as Record<string, unknown>
}

function parseCreate(raw: unknown): { merchant: `0x${string}`; amount: string; memo: string } {
  const body = asObject(raw) as Partial<CreateInvoiceBody>
  if (typeof body.merchant !== 'string' || !isAddress(body.merchant, { strict: false })) {
    throw new HttpError(400, 'A valid merchant address is required')
  }
  if (typeof body.amount !== 'string') throw new HttpError(400, 'Amount is required')
  let units: bigint
  try {
    units = parseUsdc(body.amount.trim())
  } catch {
    throw new HttpError(400, 'Amount must be a USDC value with at most 6 decimals')
  }
  if (units <= 0n) throw new HttpError(400, 'Amount must be greater than zero')
  if (units > MAX_AMOUNT) throw new HttpError(400, `Amount is capped at ${MAX_INVOICE_USDC} USDC on testnet`)
  const memo = typeof body.memo === 'string' ? body.memo.trim() : ''
  if (memo.length > MAX_MEMO_LENGTH) throw new HttpError(400, `Memo is limited to ${MAX_MEMO_LENGTH} characters`)
  return { merchant: getAddress(body.merchant), amount: units.toString(), memo }
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean)
  const method = req.method ?? 'GET'

  if (method === 'GET' && parts[0] === 'health' && parts.length === 1) {
    send(res, 200, { ok: true })
    return
  }

  if (parts[0] !== 'invoices') throw new HttpError(404, 'Not found')

  if (parts.length === 1 && method === 'GET') {
    const merchant = url.searchParams.get('merchant')
    if (!merchant || !isAddress(merchant, { strict: false })) throw new HttpError(400, 'merchant query param is required')
    send(res, 200, await listInvoices(getAddress(merchant)))
    return
  }

  if (parts.length === 1 && method === 'POST') {
    const input = parseCreate(await readJson(req))
    const existing = await listInvoices(input.merchant)
    if (existing.length >= MAX_INVOICES_PER_MERCHANT) throw new HttpError(429, 'Invoice limit reached for this address')
    send(res, 201, await createInvoice(input))
    return
  }

  const id = parts[1]
  if (!id || !/^[0-9a-f]{12}$/.test(id)) throw new HttpError(404, 'Invoice not found')
  const invoice = await getInvoice(id)
  if (!invoice) throw new HttpError(404, 'Invoice not found')

  if (parts.length === 2 && method === 'GET') {
    send(res, 200, invoice)
    return
  }

  if (parts.length === 3 && parts[2] === 'confirm' && method === 'POST') {
    const body = asObject(await readJson(req)) as Partial<ConfirmBody>
    if (typeof body.txHash !== 'string' || !isHash(body.txHash)) throw new HttpError(400, 'A valid transaction hash is required')
    const txHash = body.txHash
    if (invoice.status === 'paid') {
      if (invoice.txHash?.toLowerCase() === txHash.toLowerCase()) {
        send(res, 200, invoice)
        return
      }
      throw new HttpError(409, 'This invoice is already paid')
    }
    if (await isTxUsed(txHash)) throw new HttpError(409, 'That transaction already settled another invoice')
    try {
      const { payer } = await verifyPayment(invoice, txHash)
      const paid = await markPaid(invoice.id, { payer, txHash })
      if (!paid) throw new HttpError(409, 'This invoice was just settled by another transaction')
      console.log(`invoice ${invoice.id} paid: ${formatUsdc(BigInt(invoice.amount))} USDC`)
      send(res, 200, paid)
    } catch (error) {
      if (error instanceof VerifyError) throw new HttpError(422, error.message)
      throw error
    }
    return
  }

  throw new HttpError(405, 'Method not allowed')
}

const server = createServer((req, res) => {
  route(req, res).catch((error: unknown) => {
    if (error instanceof HttpError) {
      send(res, error.status, { error: error.message })
      return
    }
    console.error('unhandled error', error instanceof Error ? error.message : 'unknown error')
    send(res, 500, { error: 'Something went wrong. Please try again.' })
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`payments api listening on :${PORT}`)
})
