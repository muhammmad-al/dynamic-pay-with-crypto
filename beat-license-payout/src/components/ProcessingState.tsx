'use client';

import { useEffect, useState } from 'react';
import { StateMachineTrack } from './StateMachineTrack';
import type { CheckoutFlowState } from '@/hooks/useCheckoutFlow';
import type { WalletAccount } from '@/hooks/useWalletAccounts';

const EXECUTION_STATES = [
  'initiated',
  'source_attached',
  'quoted',
  'signing',
  'broadcasted',
  'source_confirmed',
] as const;

const SETTLEMENT_STATES = [
  'none',
  'routing',
  'bridging',
  'swapping',
  'settling',
  'completed',
] as const;

const RISK_STATES = ['unknown', 'pending', 'cleared'] as const;

const STEP_DESCRIPTIONS: Record<string, string> = {
  idle: '',
  creating: 'Creating transaction…',
  attaching: 'Attaching wallet source…',
  quoting: 'Fetching quote…',
  awaiting_confirmation: 'Review your quote below',
  submitting: 'Sending payment…',
  polling: 'Waiting for settlement…',
  settled: 'Payment complete!',
  failed: 'Transaction failed',
};

function formatAmount(amount?: string) {
  if (!amount) return '—';
  return parseFloat(amount).toFixed(6).replace(/\.?0+$/, '');
}

function formatTime(secs?: number) {
  if (!secs) return '—';
  if (secs < 60) return `~${secs}s`;
  return `~${Math.round(secs / 60)}m`;
}

function formatFee(fee?: string) {
  if (!fee) return '—';
  return `$${parseFloat(fee).toFixed(2)}`;
}

interface ProcessingStateProps {
  flowState: CheckoutFlowState;
  walletAccount: WalletAccount;
  onConfirm: () => void;
  onRefreshQuote: () => void;
}

export function ProcessingState({
  flowState,
  walletAccount: _walletAccount,
  onConfirm,
  onRefreshQuote,
}: ProcessingStateProps) {
  const { step, signingStep, transaction, quote, startedAt } = flowState;

  // Elapsed time counter
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const executionState = transaction?.executionState ?? 'initiated';
  const settlementState = transaction?.settlementState ?? 'none';
  const riskState = transaction?.riskState ?? 'unknown';

  // Quote expiry countdown
  const [quoteExpiry, setQuoteExpiry] = useState<number | null>(null);
  useEffect(() => {
    if (!quote?.expiresAt) return;
    const updateExpiry = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 1000)
      );
      setQuoteExpiry(remaining);
    };
    updateExpiry();
    const interval = setInterval(updateExpiry, 1000);
    return () => clearInterval(interval);
  }, [quote]);

  const isSpinning = ['creating', 'attaching', 'quoting', 'submitting', 'polling'].includes(step);
  const showQuote = step === 'awaiting_confirmation' && quote;
  const quoteExpired = quoteExpiry !== null && quoteExpiry === 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 mt-6">
      {/* Status header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {isSpinning && (
            <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          )}
          <span className="text-sm text-zinc-300">{STEP_DESCRIPTIONS[step]}</span>
          {signingStep && (
            <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">
              {signingStep === 'approval' ? 'Approve token spend' : 'Sign transaction'}
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-600 tabular-nums">{elapsed}s elapsed</span>
      </div>

      {/* Three state machine tracks */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <StateMachineTrack
          label="Execution"
          states={EXECUTION_STATES}
          currentState={executionState}
          color="blue"
        />
        <StateMachineTrack
          label="Settlement"
          states={SETTLEMENT_STATES}
          currentState={settlementState}
          color="green"
        />
        <StateMachineTrack
          label="Risk"
          states={RISK_STATES}
          currentState={riskState}
          color="purple"
        />
      </div>

      {/* Quote breakdown (shown during awaiting_confirmation) */}
      {showQuote && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Quote</p>
            {quoteExpiry !== null && (
              <span
                className={`text-xs tabular-nums ${
                  quoteExpiry < 15 ? 'text-red-400' : 'text-zinc-500'
                }`}
              >
                Expires in {quoteExpiry}s
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">You send</span>
              <span className="text-white font-medium">{formatAmount(quote.fromAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">They receive</span>
              <span className="text-white font-medium">{formatAmount(quote.toAmount)} USDC</span>
            </div>
            {quote.fees && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Total fees</span>
                <span className="text-zinc-300">{formatFee(quote.fees.totalFeeUsd)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-400">Est. time</span>
              <span className="text-zinc-300">{formatTime(quote.estimatedTimeSec)}</span>
            </div>
          </div>

          {quoteExpired ? (
            <button
              onClick={onRefreshQuote}
              className="w-full py-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold transition-colors"
            >
              Quote expired — Refresh
            </button>
          ) : (
            <button
              onClick={onConfirm}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
            >
              Confirm &amp; Pay
            </button>
          )}
        </div>
      )}

      {/* Transaction ID (once available) */}
      {transaction?.id && (
        <p className="text-center text-xs text-zinc-700 font-mono">
          tx: {transaction.id}
        </p>
      )}
    </div>
  );
}
