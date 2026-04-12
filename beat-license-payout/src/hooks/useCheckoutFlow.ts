'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createCheckoutTransaction,
  attachCheckoutTransactionSource,
  getCheckoutTransactionQuote,
  submitCheckoutTransaction,
  getCheckoutTransaction,
  cancelCheckoutTransaction,
  getActiveNetworkData,
} from '@dynamic-labs-sdk/client';
import type { CheckoutTransaction, CheckoutTransactionQuote } from '@dynamic-labs-sdk/client';
import type { WalletAccount } from '@/hooks/useWalletAccounts';
import type { PaymentToken } from '@/components/PendingState';

const CHECKOUT_ID = process.env.NEXT_PUBLIC_CHECKOUT_ID!;

const TERMINAL_EXECUTION = ['cancelled', 'expired', 'failed'] as const;
const TERMINAL_SETTLEMENT = ['completed', 'failed'] as const;

type TerminalExecution = (typeof TERMINAL_EXECUTION)[number];
type TerminalSettlement = (typeof TERMINAL_SETTLEMENT)[number];

export type FlowStep =
  | 'idle'
  | 'creating'
  | 'attaching'
  | 'quoting'
  | 'awaiting_confirmation'
  | 'submitting'
  | 'polling'
  | 'settled'
  | 'failed';

export type SigningStep = 'approval' | 'transaction' | null;

export interface CheckoutFlowState {
  step: FlowStep;
  signingStep: SigningStep;
  transactionId: string | null;
  transaction: CheckoutTransaction | null;
  quote: CheckoutTransactionQuote | null;
  error: string | null;
  startedAt: number | null;
}

export interface StartParams {
  walletAccount: WalletAccount;
  token: PaymentToken;
  amount: string;
  receivingAddress: string;
}

export function useCheckoutFlow() {
  const [state, setState] = useState<CheckoutFlowState>({
    step: 'idle',
    signingStep: null,
    transactionId: null,
    transaction: null,
    quote: null,
    error: null,
    startedAt: null,
  });

  const transactionIdRef = useRef<string | null>(null);
  const stepRef = useRef<FlowStep>('idle');
  const fromTokenRef = useRef<string>('0x0000000000000000000000000000000000000000');

  useEffect(() => {
    stepRef.current = state.step;
  }, [state.step]);

  const setError = useCallback(
    (error: string) => setState((s) => ({ ...s, step: 'failed', error })),
    []
  );

  // --- Polling ---
  const { data: polledTx } = useQuery({
    queryKey: ['checkout-transaction', state.transactionId],
    queryFn: () => getCheckoutTransaction({ transactionId: state.transactionId! }),
    enabled: state.step === 'polling' && state.transactionId !== null,
    refetchInterval: (query) => {
      const tx = query.state.data as CheckoutTransaction | undefined;
      if (!tx) return 3000;
      if (
        TERMINAL_EXECUTION.includes(tx.executionState as TerminalExecution) ||
        TERMINAL_SETTLEMENT.includes(tx.settlementState as TerminalSettlement)
      ) {
        return false;
      }
      return 3000;
    },
  });

  useEffect(() => {
    if (!polledTx || stepRef.current !== 'polling') return;
    setState((s) => ({ ...s, transaction: polledTx }));

    if (polledTx.settlementState === 'completed') {
      setState((s) => ({ ...s, step: 'settled' }));
    } else if (
      polledTx.settlementState === 'failed' ||
      TERMINAL_EXECUTION.includes(polledTx.executionState as TerminalExecution)
    ) {
      const reason =
        (polledTx.failure as { message?: string } | undefined)?.message ??
        `execution: ${polledTx.executionState}, settlement: ${polledTx.settlementState}`;
      setState((s) => ({ ...s, step: 'failed', error: reason }));
    }
  }, [polledTx]);

  // --- Main flow ---
  const start = useCallback(
    async ({ walletAccount, token, amount, receivingAddress }: StartParams) => {
      setState({
        step: 'creating',
        signingStep: null,
        transactionId: null,
        transaction: null,
        quote: null,
        error: null,
        startedAt: Date.now(),
      });
      transactionIdRef.current = null;
      fromTokenRef.current = token.tokenAddress;

      try {
        // Step 1: Create transaction
        const { transaction } = await createCheckoutTransaction({
          checkoutId: CHECKOUT_ID,
          amount,
          currency: 'USD',
          destinationAddresses: receivingAddress
            ? [{ address: receivingAddress, chain: 'EVM' }]
            : undefined,
          memo: {
            beatId: 'summer-anthem-001',
            producer: 'DJ Quantum',
            licenseType: 'exclusive',
          },
        });

        transactionIdRef.current = transaction.id;
        setState((s) => ({
          ...s,
          step: 'attaching',
          transactionId: transaction.id,
          transaction,
        }));

        // Step 2: Get the wallet's actual active chain ID, attach source
        const { networkData } = await getActiveNetworkData({ walletAccount });

        const afterAttach = await attachCheckoutTransactionSource({
          transactionId: transaction.id,
          fromAddress: walletAccount.address,
          fromChainId: networkData?.networkId ?? token.chainId,
          fromChainName: walletAccount.chain as 'EVM',
        });

        setState((s) => ({ ...s, step: 'quoting', transaction: afterAttach }));

        // Step 3: Get quote
        const afterQuote = await getCheckoutTransactionQuote({
          transactionId: transaction.id,
          fromTokenAddress: token.tokenAddress,
        });

        setState((s) => ({
          ...s,
          step: 'awaiting_confirmation',
          transaction: afterQuote,
          quote: afterQuote.quote ?? null,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [setError]
  );

  const confirm = useCallback(
    async (walletAccount: WalletAccount) => {
      const txId = transactionIdRef.current;
      if (!txId) return;

      setState((s) => ({ ...s, step: 'submitting', signingStep: null }));

      try {
        // walletAccount must be the real WalletAccount from getWalletAccounts()
        // so the SDK can delegate signing to the attached wallet provider
        const afterSubmit = await submitCheckoutTransaction({
          transactionId: txId,
          walletAccount,
          assertBalanceForGasCost: true,
          assertBalanceForTransferAmount: true,
          onStepChange: (signingStep) => {
            setState((s) => ({ ...s, signingStep }));
          },
        });

        setState((s) => ({
          ...s,
          step: 'polling',
          signingStep: null,
          transaction: afterSubmit,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        if (
          message.toLowerCase().includes('reject') ||
          message.toLowerCase().includes('denied')
        ) {
          try {
            await cancelCheckoutTransaction({ transactionId: txId });
          } catch {
            // ignore
          }
        }

        setError(message);
      }
    },
    [setError]
  );

  const refreshQuote = useCallback(async () => {
    const txId = transactionIdRef.current;
    if (!txId) return;

    setState((s) => ({ ...s, step: 'quoting' }));

    try {
      const afterQuote = await getCheckoutTransactionQuote({
        transactionId: txId,
        fromTokenAddress: fromTokenRef.current,
      });

      setState((s) => ({
        ...s,
        step: 'awaiting_confirmation',
        transaction: afterQuote,
        quote: afterQuote.quote ?? null,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [setError]);

  const reset = useCallback(() => {
    transactionIdRef.current = null;
    setState({
      step: 'idle',
      signingStep: null,
      transactionId: null,
      transaction: null,
      quote: null,
      error: null,
      startedAt: null,
    });
  }, []);

  return { state, start, confirm, refreshQuote, reset };
}
