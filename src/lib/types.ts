/** Shared between the browser app and the payments API. */

export type InvoiceStatus = 'pending' | 'paid'

export interface Invoice {
  id: string
  /** Checksummed address that receives the USDC. */
  merchant: `0x${string}`
  /** Amount in USDC base units (6 decimals), as a decimal string. */
  amount: string
  memo: string
  createdAt: number
  status: InvoiceStatus
  payer?: `0x${string}`
  txHash?: `0x${string}`
  paidAt?: number
}

export interface CreateInvoiceBody {
  merchant: string
  /** Human USDC amount, e.g. "12.50". */
  amount: string
  memo?: string
}

export interface ConfirmBody {
  txHash: string
}

export interface ApiError {
  error: string
}

export const MAX_MEMO_LENGTH = 120
/** Testnet guard rail: invoices above this are rejected. */
export const MAX_INVOICE_USDC = '10000'
