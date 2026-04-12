'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initDynamicClient } from '@/lib/dynamicClient';

const queryClient = new QueryClient();

function DynamicClientProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initDynamicClient();
      const { waitForClientInitialized } = await import('@dynamic-labs-sdk/client');
      await waitForClientInitialized();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Initializing…</div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DynamicClientProvider>{children}</DynamicClientProvider>
    </QueryClientProvider>
  );
}
