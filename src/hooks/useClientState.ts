'use client';

import { useRef, useSyncExternalStore } from 'react';
import { getDefaultClient, onEvent } from '@dynamic-labs-sdk/client';
import type { DynamicClient } from '@dynamic-labs-sdk/client';

export function useClientState<T>(
  eventName: keyof DynamicEvents,
  getSnapshot: (client: DynamicClient) => T
): T {
  const client = getDefaultClient();
  const valueRef = useRef<T>(getSnapshot(client));

  return useSyncExternalStore(
    (onStoreChange: VoidFunction) =>
      onEvent(
        {
          event: eventName,
          listener: (() => {
            valueRef.current = getSnapshot(client);
            onStoreChange();
          }) as DynamicEvents[typeof eventName],
        },
        client
      ),
    () => valueRef.current,
    () => valueRef.current
  );
}
