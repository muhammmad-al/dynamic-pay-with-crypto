'use client';

import { useState } from 'react';
import { connectWithWalletProvider, removeWalletAccount } from '@dynamic-labs-sdk/client';
import { useWalletAccounts } from '@/hooks/useWalletAccounts';
import { useWalletProviders } from '@/hooks/useWalletProviders';

const PAYMENT_TOKENS = [
  {
    label: 'ETH on Base',
    chainName: 'EVM',
    chainId: '8453',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
  },
  {
    label: 'USDC on Base',
    chainName: 'EVM',
    chainId: '8453',
    tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
  },
  {
    label: 'ETH on Arbitrum',
    chainName: 'EVM',
    chainId: '42161',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
  },
  {
    label: 'USDC on Arbitrum',
    chainName: 'EVM',
    chainId: '42161',
    tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    symbol: 'USDC',
  },
  {
    label: 'ETH on Ethereum',
    chainName: 'EVM',
    chainId: '1',
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

export function PendingState({ onConfirm }: PendingStateProps) {
  const { primaryAccount, isConnected } = useWalletAccounts();
  const providers = useWalletProviders();
  const [selectedToken, setSelectedToken] = useState<PaymentToken>(PAYMENT_TOKENS[0]);
  const [amount, setAmount] = useState('50.00');
  const [receivingAddress, setReceivingAddress] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

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

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  const amountValid = parseFloat(amount) > 0 && !isNaN(parseFloat(amount));

  return (
    <div className="w-full max-w-md mx-auto space-y-4 mt-6">
      {/* Wallet section */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
          Payment Source
        </p>

        {isConnected && primaryAccount ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">
                {truncateAddress(primaryAccount.address)}
              </p>
              <p className="text-xs text-zinc-500 capitalize">
                {primaryAccount.chain} wallet connected
              </p>
            </div>
            <button
              onClick={() => removeWalletAccount({ walletAccount: primaryAccount })}
              className="ml-auto text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-zinc-400 mb-3">Connect a wallet to continue</p>
            {providers.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">
                No wallet providers detected. Install MetaMask or another EIP-6963 wallet.
              </p>
            ) : (
              providers.map((provider) => (
                <button
                  key={provider.key}
                  onClick={() => handleConnect(provider.key)}
                  disabled={connecting !== null}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {provider.metadata.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={provider.metadata.icon}
                      alt={provider.metadata.displayName}
                      className="w-5 h-5 rounded"
                    />
                  )}
                  <span className="text-sm text-white flex-1 text-left">
                    {provider.metadata.displayName}
                  </span>
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
            {connectError && (
              <p className="text-xs text-red-400 mt-2">{connectError}</p>
            )}
          </div>
        )}
      </div>

      {isConnected && (
        <>
          {/* Token picker */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Pay With</p>
            <div className="space-y-2">
              {PAYMENT_TOKENS.map((token) => (
                <button
                  key={`${token.chainId}-${token.tokenAddress}`}
                  onClick={() => setSelectedToken(token)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                    selectedToken === token
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <span className="text-sm font-medium">{token.label}</span>
                  {selectedToken === token && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Payment amount + receiving address */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Payment Details</p>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-sm">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="50.00"
                />
                <span className="text-zinc-500 text-sm">USD</span>
              </div>
              {!amountValid && amount !== '' && (
                <p className="text-xs text-red-400 mt-1">Enter a valid amount</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Producer&apos;s Wallet Address
                <span className="text-zinc-600 ml-1">(optional — uses checkout default if empty)</span>
              </label>
              <input
                type="text"
                value={receivingAddress}
                onChange={(e) => setReceivingAddress(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                placeholder="0x… producer's wallet"
              />
            </div>
          </div>
        </>
      )}

      {/* Confirm button */}
      <button
        onClick={() => onConfirm({ token: selectedToken, amount, receivingAddress })}
        disabled={!isConnected || !amountValid}
        className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold text-sm transition-colors disabled:cursor-not-allowed"
      >
        Pay for Beat License
      </button>
    </div>
  );
}
