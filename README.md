# Arc Pay

A USDC checkout for Arc Testnet. Merchants connect a wallet, create payment links, and share them. Customers pay in USDC from their own wallet, and the server confirms each payment onchain before marking the link paid.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

- React 18, Vite, TypeScript, Tailwind CSS
- wagmi, viem, ConnectKit (injected wallets)
- A small Node-compatible HTTP API in `server/` (runs with Bun) with a JSON file store
- Arc Testnet and USDC

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run server   # payments API on :3001
bun run dev      # web app on :5173, proxies /api to the API
```

Other commands: `bun run check` (lint and typecheck).

### Environment variables

All optional. Arc Studio provisions the `RPC_PROXY_*` values inside its sandbox.

- `PORT`: API port, defaults to 3001.
- `RPC_URL_Arc_Testnet`: your own RPC endpoint for Arc Testnet. Falls back to the public RPC.
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS`: sandbox RPC proxy, used when present.

## Getting test USDC

Use the "Get test USDC" button in the Arc Studio sidebar, or the Circle faucet.
