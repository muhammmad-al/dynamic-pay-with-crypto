# Crypto Checkout Demo  
  
**Live:** https://dynamic-pay-with-crypto.vercel.app/  
  
A standalone Next.js app demonstrating Dynamic's [Deposit with Crypto](https://www.dynamic.xyz/docs/overview/deposit-with-crypto) checkout flow. Pay with any supported token on any chain — settlement is always USDC on Base.  
  
## Stack  
  
- Next.js (App Router)  
- [`@dynamic-labs-sdk/client`](https://www.dynamic.xyz/docs/javascript/reference/client/checkout-flow) — core SDK (no React SDK, no UI kit)  
- [`@dynamic-labs-sdk/evm`](https://www.dynamic.xyz/docs/overview/wallets-and-chains/overview) — EVM wallet detection via EIP-6963  
- TanStack Query  
- Tailwind CSS  
  
## Checkout Flow  
  
The checkout is a state machine. Each SDK call advances the transaction through these steps:  
  
| Step | SDK Function | What it does |  
|------|-------------|--------------|  
| 1 | `createCheckoutTransaction` | Creates a transaction, returns a session token (stored automatically) |  
| 2 | `attachCheckoutTransactionSource` | Declares the funding wallet/chain. Triggers sanctions screening |  
| 3 | `getCheckoutTransactionQuote` | Returns swap/bridge route, fees, estimated time. Quote expires in 60s |  
| 4 | `submitCheckoutTransaction` | Prepares signing payload, pops wallet for signature, broadcasts tx |  
| 5 | `trackCheckoutTransaction` | Polls execution + settlement state until terminal |  
  
All functions are imported from `@dynamic-labs-sdk/client`. See the [Checkout Flow docs](https://www.dynamic.xyz/docs/javascript/reference/client/ch-flow) for the full API reference.  
  
## Setup  
  
### 1. Get your Environment ID  
  
Go to [Developer > API Tokens](https://app.dynamic.xyz/dashboard/developer/api) in the Dynamic dashboard. Copy the **Environment ID** for your Sandbox or Live environment. See [SDK and API Keys](https://www.dynamic.xyz/docs/overview/developer-dashboard/tokens-api-keys) for details.  
  
### 2. Create a Checkout  
  
Create a checkout configuration via the [Checkout API](https://www.dynamic.xyz/docs/recipes/integrations/checkouts/checkout-api). You'll need an API token (`dyn_...`) from the same dashboard page.  
  
```bash  
curl -X POST https://app.dynamicauth.com/api/v0/environments/{environmentId}/checkouts \  
  -H "Authorization: Bearer dyn_your_api_token" \  
  -H "Content-Type: application/json" \  
  -d '{  
    "mode": "payment",  
    "settlementConfig": {  
      "strategy": "cheapest",  
      "settlements": [{  
        "chainName": "EVM",  
        "chainId": "8453",  
        "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  
        "symbol": "USDC",  
        "tokenDecimals": 6  
      }]  
    },  
    "destinationConfig": {  
      "destinations": [{  
        "chainName": "EVM",  
        "type": "address",  
        "identifier": "0xYourWalletAddress"  
      }]  
    }  
  }'
```

Save the returned `id` — that's your `NEXT_PUBLIC_CHECKOUT_ID`.

### 3. Configure environment variables

```
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your-environment-id  
NEXT_PUBLIC_CHECKOUT_ID=your-checkout-id
```

### 4. Enable chains and CORS

- **Chains & Networks** — Enable Ethereum, Base, and Arbitrum One at [app.dynamic.xyz/dashboard/chains-and-networks](https://app.dynamic.xyz/dashboard/chains-and-networks)
- **CORS Origins** — Add your deployment URL(s) at [app.dynamic.xyz/dashboard/security#cors](https://app.dynamic.xyz/dashboard/security#cors). Both `http://localhost:3000` (for local dev) and your Vercel URL (for production) must be added.

## Local Development

```sh
npm install  
npm run dev  
# → http://localhost:3000
```

## Tested Payment Paths

| Source | Settlement | Time | Gas Cost |
|--------|-----------|------|----------|
| ETH on Ethereum → USDC on Base | $0.50 | ~2m 13s | ~$0.06 |
| ETH on Arbitrum → USDC on Base | $0.52 | ~3m 14s | ~$0.007 |
| ETH on Base → USDC on Base | $0.50 | ~17s | ~$0.003 |
| USDC on Arbitrum → USDC on Base | $1.00 | ~32s | ~$0.01 |

## Known Issues

- **Settlement states don't stream in real time** — The WebSocket channel (`subscribeToCheckoutTransaction`) subscribes to Ably but the backend doesn't publish to it yet. Falls back to HTTP polling.
- **Gas price race on L2s** — `maxFeePerGas` from the quote can be stale by broadcast time on Arbitrum/Base. Retry usually works.
- **ERC-20 approval is a separate tx** — Paying with a token (e.g. USDC) requires a spending cap approval before the swap transaction (two wallet popups).
- **Project settings cache** — SDK caches settings for 5 minutes. After enabling new chains in the dashboard, hard refresh or clear site data.

## Related

- [Deposit with Crypto overview](https://www.dynamic.xyz/docs/overview/deposit-with-crypto)
- [Checkout Flow — JS client reference](https://www.dynamic.xyz/docs/javascript/reference/client/checkout-flow)
- [Checkout via API recipe](https://www.dynamic.xyz/docs/recipes/integrations/checkouts/checkout-api)
- [Chains & external wallet support](https://www.dynamic.xyz/docs/overview/wallets-and-chains/overview)
