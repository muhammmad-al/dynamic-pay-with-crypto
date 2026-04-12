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
  getNetworksData,
  switchActiveNetwork,
  trackCheckoutTransaction,
  onEvent,
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
  fromToken: PaymentToken | null;
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
    fromToken: null,
    error: null,
    startedAt: null,
  });

  const transactionIdRef = useRef<string | null>(null);
  const stepRef = useRef<FlowStep>('idle');
  const fromTokenRef = useRef<string>('0x0000000000000000000000000000000000000000');
  // Realtime event unsubscribe functions
  const unsubsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    stepRef.current = state.step;
  }, [state.step]);

  const cleanupRealtime = useCallback(() => {
    unsubsRef.current.forEach((fn) => fn());
    unsubsRef.current = [];
  }, []);

  const setError = useCallback(
    (error: string) => {
      cleanupRealtime();
      setState((s) => ({ ...s, step: 'failed', error }));
    },
    [cleanupRealtime]
  );

  // --- Polling (fallback) ---
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
      cleanupRealtime();
      setState((s) => ({ ...s, step: 'settled' }));
    } else if (
      polledTx.settlementState === 'failed' ||
      TERMINAL_EXECUTION.includes(polledTx.executionState as TerminalExecution)
    ) {
      cleanupRealtime();
      const reason =
        (polledTx.failure as { message?: string } | undefined)?.message ??
        `execution: ${polledTx.executionState}, settlement: ${polledTx.settlementState}`;
      setState((s) => ({ ...s, step: 'failed', error: reason }));
    }
  }, [polledTx, cleanupRealtime]);

  // --- Main flow ---
  const start = useCallback(
    async ({ walletAccount, token, amount, receivingAddress }: StartParams) => {
      cleanupRealtime();
      setState({
        step: 'creating',
        signingStep: null,
        transactionId: null,
        transaction: null,
        quote: null,
        fromToken: token,
        error: null,
        startedAt: Date.now(),
      });
      transactionIdRef.current = null;
      fromTokenRef.current = token.tokenAddress;

      try {
        // Debug: log which networks are actually enabled in the Dynamic dashboard
        const allNetworks = getNetworksData();
        console.log('Available networks:', allNetworks.map(n => ({ id: n.networkId, name: n.displayName, chain: n.chain })));

        // Step 1: Create transaction
        const { transaction } = await createCheckoutTransaction({
          checkoutId: CHECKOUT_ID,
          amount,
          currency: 'USD',
          destinationAddresses: receivingAddress
            ? [{ address: receivingAddress, chain: 'EVM' }]
            : undefined,
        });

        transactionIdRef.current = transaction.id;
        setState((s) => ({
          ...s,
          step: 'attaching',
          transactionId: transaction.id,
          transaction,
        }));

        // Step 2: Switch wallet to the correct network, then attach source
        await switchActiveNetwork({ walletAccount, networkId: token.networkId });
        const { networkData } = await getActiveNetworkData({ walletAccount });

        if (!networkData) {
          throw new Error(
            `Network ${token.networkName} (${token.networkId}) is not enabled in your Dynamic dashboard. ` +
            `Go to Chains & Networks settings to enable it.`
          );
        }

        const afterAttach = await attachCheckoutTransactionSource({
          transactionId: transaction.id,
          fromAddress: walletAccount.address,
          fromChainId: networkData?.networkId ?? token.networkId,
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
    [setError, cleanupRealtime]
  );

  const confirm = useCallback(
    async (walletAccount: WalletAccount) => {
      const txId = transactionIdRef.current;
      if (!txId) return;

      setState((s) => ({ ...s, step: 'submitting', signingStep: null }));

      try {
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

        // Start realtime WebSocket tracking (primary source for state updates)
        try {
          await trackCheckoutTransaction({ transactionId: txId });
        } catch {
          // Non-fatal — polling will cover it
        }

        // Subscribe to execution state changes
        const unsubExec = onEvent({
          event: 'checkoutTransactionExecutionStateChanged',
          listener: (args) => {
            if (args.transactionId !== txId) return;
            setState((s) => {
              if (s.step !== 'polling') return s;
              const updatedTx = s.transaction
                ? { ...s.transaction, executionState: args.newState } as CheckoutTransaction
                : s.transaction;
              if (TERMINAL_EXECUTION.includes(args.newState as TerminalExecution)) {
                cleanupRealtime();
                return {
                  ...s,
                  transaction: updatedTx,
                  step: 'failed',
                  error: `execution: ${args.newState}`,
                };
              }
              return { ...s, transaction: updatedTx };
            });
          },
        });

        // Subscribe to settlement state changes
        const unsubSettle = onEvent({
          event: 'checkoutTransactionSettlementStateChanged',
          listener: (args) => {
            if (args.transactionId !== txId) return;
            setState((s) => {
              if (s.step !== 'polling') return s;
              const updatedTx = s.transaction
                ? { ...s.transaction, settlementState: args.newState } as CheckoutTransaction
                : s.transaction;
              if (args.newState === 'completed') {
                cleanupRealtime();
                return { ...s, transaction: updatedTx, step: 'settled' };
              }
              if (args.newState === 'failed') {
                cleanupRealtime();
                return { ...s, transaction: updatedTx, step: 'failed', error: 'settlement failed' };
              }
              return { ...s, transaction: updatedTx };
            });
          },
        });

        unsubsRef.current = [unsubExec, unsubSettle];
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
    [setError, cleanupRealtime]
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
    cleanupRealtime();
    transactionIdRef.current = null;
    setState({
      step: 'idle',
      signingStep: null,
      transactionId: null,
      transaction: null,
      quote: null,
      fromToken: null,
      error: null,
      startedAt: null,
    });
  }, [cleanupRealtime]);

  return { state, start, confirm, refreshQuote, reset };
}
