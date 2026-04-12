let initialized = false;

export async function initDynamicClient() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const { createDynamicClient } = await import('@dynamic-labs-sdk/client');
  const { addEvmExtension } = await import('@dynamic-labs-sdk/evm');

  createDynamicClient({
    environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '449fda96-0bdb-463d-aad8-a528bccaab05',
  });

  addEvmExtension();
}
