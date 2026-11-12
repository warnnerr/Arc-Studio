import type { ConfirmBody, CreateInvoiceBody, Invoice } from './types'

export class ApiRequestError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    throw new ApiRequestError('Cannot reach the payments server. Check your connection and retry.')
  }
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Request failed. Please try again.'
    throw new ApiRequestError(message)
  }
  return data as T
}

export const api = {
  listInvoices: (merchant: string) => request<Invoice[]>(`/invoices?merchant=${encodeURIComponent(merchant)}`),
  getInvoice: (id: string) => request<Invoice>(`/invoices/${encodeURIComponent(id)}`),
  createInvoice: (body: CreateInvoiceBody) =>
    request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(body) }),
  confirmPayment: (id: string, body: ConfirmBody) =>
    request<Invoice>(`/invoices/${encodeURIComponent(id)}/confirm`, { method: 'POST', body: JSON.stringify(body) }),
}
