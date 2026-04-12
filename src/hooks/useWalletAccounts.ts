'use client';

import { getWalletAccounts } from '@dynamic-labs-sdk/client';
import { useClientState } from './useClientState';

export type WalletAccount = ReturnType<typeof getWalletAccounts>[number];

export function useWalletAccounts() {
  const accounts = useClientState(
    'walletAccountsChanged',
    (client) => getWalletAccounts(client)
  );

  return {
    accounts,
    primaryAccount: accounts[0] ?? null,
    isConnected: accounts.length > 0,
  };
}
