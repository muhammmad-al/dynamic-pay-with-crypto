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

interface BeatCardProps {
  status: BadgeVariant;
  amount?: string;
}

export function BeatCard({ status, amount = '50.00' }: BeatCardProps) {
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
      {/* Waveform visual */}
      <div className="flex items-end gap-0.5 h-8 mb-5">
        {[3, 6, 9, 5, 11, 7, 4, 10, 6, 8, 3, 7, 5, 9, 4, 8, 6, 11, 3, 7].map(
          (h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-300 ${
                status === 'processing'
                  ? 'bg-blue-500'
                  : status === 'settled'
                  ? 'bg-green-500'
                  : 'bg-zinc-600'
              }`}
              style={{ height: `${h * 10}%` }}
            />
          )
        )}
      </div>

      {/* Beat info */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
            Beat License
          </p>
          <h2 className="text-xl font-semibold text-white">Summer Anthem</h2>
          <p className="text-sm text-zinc-400 mt-0.5">DJ Quantum</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-white">${parseFloat(amount || '0').toFixed(2)}</p>
          <p className="text-xs text-zinc-500 mt-0.5">USDC · Exclusive</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
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
