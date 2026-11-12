import { useQuery } from '@tanstack/react-query'
import { buildShareLink } from '@/lib/share'

/** Resolves the shareable URL for a checkout page. Undefined until the share base is known. */
export function useShareLink(invoiceId: string): string | undefined {
  const { data } = useQuery({
    queryKey: ['share-link', invoiceId],
    queryFn: () => buildShareLink(`/pay/${invoiceId}`),
    staleTime: Infinity,
  })
  return data
}
