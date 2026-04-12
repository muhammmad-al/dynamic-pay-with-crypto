'use client';

import { getAvailableWalletProvidersData } from '@dynamic-labs-sdk/client';
import { useClientState } from './useClientState';

export function useWalletProviders() {
  return useClientState(
    'walletProviderChanged',
    (client) => getAvailableWalletProvidersData(client)
  );
}
