'use client';

type BadgeVariant = 'pending' | 'processing' | 'settled' | 'failed';

const badgeStyles: Record<BadgeVariant, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  settled: 'bg-green-500/10 text-green-400 border border-green-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const badgeLabels: Record<BadgeVariant, string> = {
  pending: 'Awaiting Confirmation',
  processing: 'Processing Payment',
  settled: 'Settled',
  failed: 'Failed',
};

interface PaymentCardProps {
  status: BadgeVariant;
  amount?: string;
  recipientAddress?: string;
}

function truncateAddress(addr: string) {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function PaymentCard({ status, amount = '', recipientAddress }: PaymentCardProps) {
  const parsedAmount = parseFloat(amount);
  const displayAmt = amount && !isNaN(parsedAmount) && parsedAmount > 0
    ? `$${parsedAmount.toFixed(2)}`
    : null;

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
      {/* Order total + Merchant Wallet */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Order Total</p>
          {displayAmt ? (
            <p className="text-3xl font-bold text-white">{displayAmt}</p>
          ) : (
            <p className="text-3xl font-bold text-zinc-700">$0.00</p>
          )}
          <p className="text-xs text-zinc-500 mt-0.5">USD</p>
        </div>
        <div className="text-right shrink-0 max-w-[55%]">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Merchant Wallet</p>
          {recipientAddress ? (
            <p className="text-sm font-mono text-zinc-300">{truncateAddress(recipientAddress)}</p>
          ) : (
            <p className="text-sm text-zinc-600 italic">checkout default</p>
          )}
        </div>
      </div>

      {/* Settlement pill */}
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          Settles as USDC · Base
        </span>
      </div>

      {/* Status badge */}
      <div className="pt-4 border-t border-zinc-800">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${badgeStyles[status]}`}
        >
          {status === 'processing' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          )}
          {badgeLabels[status]}
        </span>
      </div>
    </div>
  );
}
