'use client';

import { useState } from 'react';
import type { CheckoutTransaction } from '@dynamic-labs-sdk/client';
import type { PaymentToken } from './PendingState';

interface SettledStateProps {
  transaction: CheckoutTransaction | null;
  fromToken: PaymentToken | null;
  startedAt: number | null;
  onReset: () => void;
}

function truncateTxHash(hash?: string) {
  if (!hash) return null;
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function formatElapsed(startedAt: number | null, endAt: number) {
  if (!startedAt) return null;
  const secs = Math.floor((endAt - startedAt) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function formatUsdcAmount(rawAmount?: string): string {
  if (!rawAmount) return '—';
  const num = Number(rawAmount) / 1e6;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function getTokenDecimals(symbol?: string): number {
  if (!symbol) return 18;
  const s = symbol.toUpperCase();
  if (s === 'USDC' || s === 'USDT') return 6;
  if (s === 'SOL') return 9;
  if (s === 'BTC') return 8;
  return 18;
}

function formatTokenAmount(rawAmount: string | undefined, decimals: number): string {
  if (!rawAmount) return '—';
  const num = Number(rawAmount) / Math.pow(10, decimals);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export function SettledState({ transaction, fromToken, startedAt, onReset }: SettledStateProps) {
  const [copied, setCopied] = useState(false);
  // Capture settled timestamp at mount — freezes the elapsed timer
  const [settledAt] = useState(() => Date.now());

  const txHash = transaction?.txHash;
  const elapsed = formatElapsed(startedAt, settledAt);

  const fromSymbol = fromToken?.symbol ?? 'ETH';
  const fromDecimals = getTokenDecimals(fromSymbol);
  const paidAmount = formatTokenAmount(transaction?.quote?.fromAmount, fromDecimals);
  const receivedAmount = formatUsdcAmount(transaction?.quote?.toAmount);

  const copyHash = () => {
    if (!txHash) return;
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 mt-6">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Payment Complete</h2>
        <p className="text-sm text-zinc-400 mt-1">Merchant received USDC on Base</p>
      </div>

      {/* Details card */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
          Settlement Details
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">You paid</span>
            <span className="text-white font-medium">{paidAmount} {fromSymbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Merchant received</span>
            <span className="text-green-400 font-medium">{receivedAmount} USDC on Base</span>
          </div>
          {elapsed && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Time to settle</span>
              <span className="text-white">{elapsed}</span>
            </div>
          )}
        </div>

        {/* Tx hash */}
        {txHash && (
          <div className="pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500 font-mono truncate">
                {truncateTxHash(txHash)}
              </span>
              <button
                onClick={copyHash}
                className="text-xs text-zinc-400 hover:text-white transition-colors shrink-0"
              >
                {copied ? 'Copied!' : 'Copy hash'}
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// Error state
interface FailedStateProps {
  error: string | null;
  onReset: () => void;
}

export function FailedState({ error, onReset }: FailedStateProps) {
  return (
    <div className="w-full max-w-md mx-auto space-y-4 mt-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Transaction Failed</h2>
        {error && (
          <p className="text-sm text-red-400 mt-2 font-mono break-all">{error}</p>
        )}
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
