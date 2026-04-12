'use client';

import { useState } from 'react';
import { BeatCard } from '@/components/BeatCard';
import { PendingState } from '@/components/PendingState';
import { ProcessingState } from '@/components/ProcessingState';
import { SettledState, FailedState } from '@/components/SettledState';
import { useCheckoutFlow } from '@/hooks/useCheckoutFlow';
import { useWalletAccounts } from '@/hooks/useWalletAccounts';
import type { PendingConfirmParams } from '@/components/PendingState';

const PROCESSING_STEPS = [
  'creating',
  'attaching',
  'quoting',
  'awaiting_confirmation',
  'submitting',
  'polling',
] as const;

type ProcessingStep = (typeof PROCESSING_STEPS)[number];

export default function Home() {
  const { state, start, confirm, refreshQuote, reset } = useCheckoutFlow();
  const { primaryAccount } = useWalletAccounts();

  // Track amount so BeatCard stays in sync with what the user typed
  const [displayAmount, setDisplayAmount] = useState('50.00');

  const { step, transaction, startedAt, error } = state;

  const cardStatus =
    step === 'idle' ? 'pending'
    : step === 'settled' ? 'settled'
    : step === 'failed' ? 'failed'
    : 'processing';

  const handleConfirm = ({ token, amount, receivingAddress }: PendingConfirmParams) => {
    if (!primaryAccount) return;
    setDisplayAmount(amount);
    start({ walletAccount: primaryAccount, token, amount, receivingAddress });
  };

  const handlePayConfirm = () => {
    if (!primaryAccount) return;
    confirm(primaryAccount);
  };

  const isProcessing = PROCESSING_STEPS.includes(step as ProcessingStep);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">
            Dynamic · Pay with Crypto Demo
          </p>
          <h1 className="text-2xl font-bold text-white">Beat License Payout</h1>
        </div>

        <BeatCard status={cardStatus} amount={displayAmount} />

        {step === 'idle' && (
          <PendingState onConfirm={handleConfirm} />
        )}

        {isProcessing && primaryAccount && (
          <ProcessingState
            flowState={state}
            walletAccount={primaryAccount}
            onConfirm={handlePayConfirm}
            onRefreshQuote={refreshQuote}
          />
        )}

        {step === 'settled' && (
          <SettledState
            transaction={transaction}
            startedAt={startedAt}
            onReset={reset}
          />
        )}

        {step === 'failed' && (
          <FailedState error={error} onReset={reset} />
        )}
      </div>
    </main>
  );
}
