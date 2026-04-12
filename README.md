# Crypto Checkout Demo  
  
Live: https://dynamic-pay-with-crypto.vercel.app/  
  
A standalone Next.js app demonstrating [Dynamic's Deposit with Crypto](https://www.dynamic.xyz/docs/overview/deposit-with-crypto) (checkout) flow. Pay with any supported token on any chain — settlement is always USDC on Base.  
  
## Stack  
  
- Next.js (App Router)  
- `@dynamic-labs-sdk/client` — core SDK (no React SDK, no UI kit)  
- `@dynamic-labs-sdk/evm` — EVM wallet detection via EIP-6963  
- TanStack Query — async state management  
- Tailwind CSS  
  
## Dynamic SDK Setup  
  
```ts  
import { createDynamicClient } from '@dynamic-labs-sdk/client';  
import { addEvmExtension } from '@dynamic-labm';  
  
createDynamicClient({  
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,  
});  
  
addEvmExtension();
```

No coreConfig.apiBaseUrl override — the SDK defaults to production (https://app.dynamicauth.com/api/v0).

## Checkout Flow
The checkout is a state machine. Each SDK call advances the transaction through these steps:

| Step | SDK Function | What it does |
|------|-------------|--------------|
| 1 | `createCheckoutTransaction({ checkoutId, amount, currency })` | Creates a transaction, returns a session token (stored automatically) |
| 2 | `attachCheckoutTransactionSource({ transactionId, fromAddress, fromChainId, fromChainName })` | Declares the funding wallet/chain. Triggers async sanctions screening (Chainalysis) |
| 3 | `getCheckoutTransactionQuote({ transactionId, fromTokenAddress })` | Returns swap/bridge route, fees, estimated time. Quote expires in 60s |
| 4 | `submitCheckoutTransaction({ transactionId, walletAccount, onStepChange })` | Prepares signing payload, pops wallet for signature, broadcasts tx hash |
| 5 | `trackCheckoutTransaction({ transactionId })` | Pollsxecution + settlement state until terminal |

All functions are imported from `@dynamic-labs-sdk/client`.

## Key Patterns

### Wallet Detection
Wallets are detected via EIP-6963 (injected provider announcements). Subscribe to changes:

```ts
import { onEvent, getAvailableWalletProvidersData } from '@dynamic-labs-sdk/client';  
  
onEvent({  
  event: 'walletProviderChanged',  
  listener: () => {  
    const providers = getAvailableWalletProvidersData();  
    // update UI  
  },  
});
```

### Network Switching
Before submitting, switch the wallet to the correct network:

```ts
import { switchActiveNetwork, getActiveNetworkData } from '@dynamic-labs-sdk/client';  
  
await switchActiveNetwork({ networkId: '42161', walletAccount }); // Arbitrum  
const { networkData } = await getActiveNetworkData({ walletAccount });
```

### Reactive Network List
`getNetworksData()` reads from cached project settings. On first render, settings may not be loaded yet. Subscribe to `projectSettingsChanged` and `initStatusChanged` events to re-read:

```ts
import { onEvent, getNetworksData } from '@dynamic-labs-sdk/client';  
  
onEvent({ event: 'projectSettingsChanged', listener: () => refresh() });  
onEvent({ event: 'initStatusChanged', listener: ({ initStatus }) => {  
  if (initStatus === 'finished') refresh();  
}});
```

### Token Amount Formatting
Quote responses return raw token amounts (e.g., `1005224` for USDC). Divide by `10^decimals`:

```ts
function formatTokenAmount(raw: string, decimals: number): string {  
  return (Number(raw) / Math.pow(10, decimals)).toLocaleString('en-US', {  
    maximumFractionDigits: 6,  
  });  
}
```

Common decimals: USDC/USDT = 6, ETH = 18, SOL = 9, BTC = 8.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Your Dynamic environment ID |
| `NEXT_PUBLIC_CHECKOUT_ID` | Checkout config ID (created via Dynamic API) |

## Dashboard Setup

- **Chains & Networks** — Enable Ethereum, Base, and Arbitrum One at [app.dynamic.xyz/dashboard/chains-and-networks](https://app.dynamic.xyz/dashboard/chains-and-networks)
- **CORS Origins** — Add your deployment URL at [app.dynamic.xyz/dashboard/security#cors](https://app.dynamic.xyz/dashboard/security#cors)
- **Checkout** — Create kout via the API with settlement in USDC on Base (chain ID `8453`)

## Tested Payment Paths

| Source | Settlement | Time | Gas Cost |
|--------|-----------|------|----------|
| ETH on Ethereum → USDC on Base | $0.50 | ~2m 13s | ~$0.06 |
| ETH on Arbitrum → USDC on Base | $0.52 | ~3m 14s | ~$0.007 |
| ETH on Base → USDC on Base | $0.50 | ~17s | ~$0.003 |
| USDC on Arbitrum → USDC on Base | $1.00 | ~32s | ~$0.01 |

## Known Issues

- **Settlement states don't stream in real time** — WebSocket channel (`subscribeToCheckoutTransaction`) subscribes to Ably but the backend doesn't publish to it yet. Falls back to HTTP polling.
- **Gas price race on L2s** — `maxFeePerGas` from the quote can be stale by broadcast time on Arbitrum/Base. Retry usually works.
- **ERC-20 approval is a separate tx** — Paying with USDC requires a spending cap approval before the swap transaction (two wallet popups).
- **Unhelpful revert errors** — Insufficient balance for gas shows `"FAILED_WOULD_REVERT"` instead of a human-readable message.
- **Project settings cache** — SDK caches settings for 5 minutes. After enabling new chains in the dashboard, hard ite data.

## Local Development

```sh
npm install  
npm run dev  
# → http://localhost:3000
```

Add `http://localhost:3000` to CORS origins in the Dynamic dashboard before testing locally.
