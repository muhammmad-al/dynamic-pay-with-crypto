'use client';

// NOTE: If you enable new chains in the Dynamic dashboard after first use,
// clear site data (DevTools → Application → Storage → Clear site data)
// to force the SDK to fetch fresh project settings.

import { useState, useEffect } from 'react';
import { connectWithWalletProvider, removeWalletAccount, getNetworksData, onEvent } from '@dynamic-labs-sdk/client';
import { useWalletAccounts } from '@/hooks/useWalletAccounts';
import { useWalletProviders } from '@/hooks/useWalletProviders';

const PAYMENT_TOKENS = [
  {
    label: 'ETH on Base',
    networkId: '8453',
    networkName: 'Base',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
  },
  {
    label: 'USDC on Base',
    networkId: '8453',
    networkName: 'Base',
    tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
  },
  {
    label: 'ETH on Arbitrum',
    networkId: '42161',
    networkName: 'Arbitrum One',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
  },
  {
    label: 'USDC on Arbitrum',
    networkId: '42161',
    networkName: 'Arbitrum One',
    tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    symbol: 'USDC',
  },
  {
    label: 'ETH on Ethereum',
    networkId: '1',
    networkName: 'Ethereum',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
  },
] as const;

export type PaymentToken = (typeof PAYMENT_TOKENS)[number];

export interface PendingConfirmParams {
  token: PaymentToken;
  amount: string;
  receivingAddress: string;
}

interface PendingStateProps {
  onConfirm: (params: PendingConfirmParams) => void;
}

const PRESETS = [0.5, 1, 2, 5] as const;
type PresetAmount = (typeof PRESETS)[number] | 'custom';

const tokenKey = (t: PaymentToken) => `${t.networkId}-${t.tokenAddress}`;
const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export function PendingState({ onConfirm }: PendingStateProps) {
  const { primaryAccount, isConnected } = useWalletAccounts();
  const providers = useWalletProviders();

  // Reactive token list — re-computed when SDK finishes init or project settings update.
  // Falls back to showing all tokens if network data isn't loaded yet.
  const [availableTokens, setAvailableTokens] = useState<typeof PAYMENT_TOKENS[number][]>([]);

  useEffect(() => {
    const refresh = () => {
      try {
        const allNetworks = getNetworksData();
        console.log('Available networks:', allNetworks.map(n => ({ id: n.networkId, name: n.displayName, chain: n.chain })));
        const ids = new Set(allNetworks.map(n => n.networkId));
        const filtered = PAYMENT_TOKENS.filter(t => ids.has(t.networkId));
        setAvailableTokens(filtered.length > 0 ? filtered : [...PAYMENT_TOKENS]);
      } catch {
        // SDK not ready yet — show all tokens so the UI isn't blank
        setAvailableTokens([...PAYMENT_TOKENS]);
      }
    };

    // Run immediately (SDK may already be hydrated)
    refresh();

    // Re-run when the SDK fetches fresh project settings from the backend
    const unsubSettings = onEvent({
      event: 'projectSettingsChanged',
      listener: () => refresh(),
    });

    // Belt-and-suspenders: also re-run when init finishes (covers cache-hydration path
    // where settings are restored from storage before raiseStateEvents is wired up)
    const unsubInit = onEvent({
      event: 'initStatusChanged',
      listener: ({ initStatus }) => {
        if (initStatus === 'finished') refresh();
      },
    });

    return () => {
      unsubSettings();
      unsubInit();
    };
  }, []);

  const [selectedPreset, setSelectedPreset] = useState<PresetAmount>(1);
  const [customAmount, setCustomAmount] = useState('');
  const [receivingAddress, setReceivingAddress] = useState('');
  const [selectedToken, setSelectedToken] = useState<PaymentToken>(PAYMENT_TOKENS[0]);

  // When the available token list resolves, default-select the first one
  useEffect(() => {
    if (availableTokens.length > 0) {
      setSelectedToken((prev) =>
        availableTokens.includes(prev) ? prev : availableTokens[0]
      );
    }
  }, [availableTokens]);

  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const amountNum =
    selectedPreset === 'custom' ? parseFloat(customAmount) : selectedPreset;
  const amountStr =
    selectedPreset === 'custom' ? customAmount : String(selectedPreset);
  const amountValid = amountNum > 0 && !isNaN(amountNum);

  const canPay = isConnected && amountValid && receivingAddress.trim().length > 0;

  const payLabel = amountValid
    ? `Pay $${amountNum.toFixed(2)} with ${selectedToken.symbol}`
    : `Pay with ${selectedToken.symbol}`;

  const handleConnect = async (walletKey: string) => {
    setConnecting(walletKey);
    setConnectError(null);
    try {
      await connectWithWalletProvider({ walletProviderKey: walletKey });
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-zinc-800">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Powered by Dynamic</p>
        <h1 className="text-xl font-bold text-white">Crypto Checkout</h1>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Amount presets */}
        <div>
          <p className="text-xs text-zinc-500 mb-2">Amount</p>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPreset(p)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedPreset === p
                    ? 'bg-blue-600 border-blue-600 text-white font-medium'
                    : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                }`}
              >
                ${p}
              </button>
            ))}
            <button
              onClick={() => setSelectedPreset('custom')}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                selectedPreset === 'custom'
                  ? 'bg-blue-600 border-blue-600 text-white font-medium'
                  : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
              }`}
            >
              Custom
            </button>
          </div>

          {selectedPreset === 'custom' && (
            <div className="mt-2 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-blue-500 transition-colors">
              <span className="text-zinc-500 text-sm">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                autoFocus
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
                placeholder="0.00"
              />
              <span className="text-zinc-500 text-sm shrink-0">USD</span>
            </div>
          )}
        </div>

        {/* Recipient wallet */}
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Recipient wallet</label>
          <input
            type="text"
            value={receivingAddress}
            onChange={(e) => setReceivingAddress(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            placeholder="0x..."
          />
          <p className="mt-1.5 text-[11px] text-zinc-600">
            Settles as USDC on Base
          </p>
        </div>

        {/* Token selector */}
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Pay with</label>
          <div className="relative">
            <select
              value={tokenKey(selectedToken)}
              onChange={(e) => {
                const token = PAYMENT_TOKENS.find((t) => tokenKey(t) === e.target.value);
                if (token) setSelectedToken(token);
              }}
              className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer pr-9"
            >
              {availableTokens.map((token) => (
                <option key={tokenKey(token)} value={tokenKey(token)}>
                  {token.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={() => onConfirm({ token: selectedToken, amount: amountStr, receivingAddress })}
          disabled={!canPay}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold text-sm transition-colors disabled:cursor-not-allowed"
        >
          {payLabel}
        </button>

      </div>

      {/* Wallet footer */}
      <div className="px-6 pb-5">
        {isConnected && primaryAccount ? (
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Connected:{' '}
              <span className="font-mono text-zinc-400">{truncate(primaryAccount.address)}</span>
            </span>
            <button
              onClick={() => removeWalletAccount({ walletAccount: primaryAccount })}
              className="text-zinc-600 hover:text-red-400 transition-colors ml-2"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 mb-2">Connect a wallet to pay</p>
            {providers.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">
                No wallet detected. Install MetaMask or another EIP-6963 wallet.
              </p>
            ) : (
              providers.map((provider) => (
                <button
                  key={provider.key}
                  onClick={() => handleConnect(provider.key)}
                  disabled={connecting !== null}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {provider.metadata.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={provider.metadata.icon} alt={provider.metadata.displayName} className="w-5 h-5 rounded" />
                  )}
                  <span className="text-sm text-white flex-1 text-left">{provider.metadata.displayName}</span>
                  {connecting === provider.key ? (
                    <span className="text-xs text-zinc-400 animate-pulse">Connecting…</span>
                  ) : (
                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
            {connectError && <p className="text-xs text-red-400">{connectError}</p>}
          </div>
        )}
      </div>

    </div>
  );
}
