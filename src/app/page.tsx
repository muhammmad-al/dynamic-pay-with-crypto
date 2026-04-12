'use client';

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

  const { step, transaction, startedAt, error, fromToken } = state;

  const handleConfirm = ({ token, amount, receivingAddress }: PendingConfirmParams) => {
    if (!primaryAccount) return;
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
            fromToken={fromToken}
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
