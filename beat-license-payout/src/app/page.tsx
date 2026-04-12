'use client';

import { useState } from 'react';
import { PaymentCard } from '@/components/PaymentCard';
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

  // Live preview state — updates as user types
  const [displayAmount, setDisplayAmount] = useState('');
  const [displayRecipient, setDisplayRecipient] = useState('');

  const { step, transaction, startedAt, error } = state;

  const cardStatus =
    step === 'idle' ? 'pending'
    : step === 'settled' ? 'settled'
    : step === 'failed' ? 'failed'
    : 'processing';

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
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">
            Powered by Dynamic
          </p>
          <h1 className="text-2xl font-bold text-white">Pay with Crypto Demo</h1>
        </div>

        {/* Invoice framing */}
        {step === 'idle' && (
          <div className="text-center mb-4">
            <p className="text-xs text-zinc-600">Invoice #1042</p>
            <p className="text-sm text-zinc-400 font-medium mt-0.5">Logo Design — Acme Corp</p>
          </div>
        )}

        {/* Payment card — live preview while idle */}
        <PaymentCard
          status={cardStatus}
          amount={displayAmount}
          recipientAddress={displayRecipient || undefined}
        />

        {step === 'idle' && (
          <PendingState
            onConfirm={handleConfirm}
            onAmountChange={setDisplayAmount}
            onAddressChange={setDisplayRecipient}
          />
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
