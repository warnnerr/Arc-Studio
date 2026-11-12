import { erc20Abi } from 'viem'
import { useReadContract } from 'wagmi'
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/chain'

/** The single USDC balance (ERC-20 view, 6 decimals). Arc's native gas balance is the same pool. */
export function useUsdcBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 8000 },
  })
}
