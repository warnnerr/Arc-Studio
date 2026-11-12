export function isUserRejection(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const message = 'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : ''
  const code = 'code' in error ? error.code : undefined
  return code === 4001 || message.includes('user rejected') || message.includes('user denied')
}

export function parseOnchainError(error: unknown): string {
  const message =
    typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message.toLowerCase()
      : ''
  if (isUserRejection(error)) return 'Payment cancelled.'
  if (message.includes('insufficient funds') || message.includes('exceeds balance')) {
    return 'Insufficient USDC balance. Get test USDC from the Arc Studio sidebar and try again.'
  }
  if (message.includes('reverted')) return 'The transaction failed onchain. Please try again.'
  if (message.includes('network') || message.includes('timeout')) {
    return 'Network issue. Check your connection and retry.'
  }
  return 'Something went wrong. Please try again.'
}
