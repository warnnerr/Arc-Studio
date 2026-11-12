import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const merchantInvoicesKey = (address: string) => ['invoices', address.toLowerCase()] as const

export function useMerchantInvoices(address: `0x${string}` | undefined) {
  return useQuery({
    queryKey: merchantInvoicesKey(address ?? 'none'),
    queryFn: () => api.listInvoices(address as string),
    enabled: Boolean(address),
    refetchInterval: 4000,
  })
}
