'use client';

interface StateMachineTrackProps {
  label: string;
  states: readonly string[];
  currentState: string;
  color: 'blue' | 'green' | 'purple';
}

const colorMap = {
  blue: {
    active: 'bg-blue-500 ring-2 ring-blue-500/30',
    done: 'bg-blue-600',
    pulse: 'bg-blue-400',
    text: 'text-blue-400',
    connector: 'bg-blue-600',
  },
  green: {
    active: 'bg-green-500 ring-2 ring-green-500/30',
    done: 'bg-green-600',
    pulse: 'bg-green-400',
    text: 'text-green-400',
    connector: 'bg-green-600',
  },
  purple: {
    active: 'bg-purple-500 ring-2 ring-purple-500/30',
    done: 'bg-purple-600',
    pulse: 'bg-purple-400',
    text: 'text-purple-400',
    connector: 'bg-purple-600',
  },
};

const FAILED_STATES = ['failed', 'cancelled', 'expired', 'blocked'];

export function StateMachineTrack({
  label,
  states,
  currentState,
  color,
}: StateMachineTrackProps) {
  const colors = colorMap[color];
  const currentIndex = states.indexOf(currentState);
  const isFailed = FAILED_STATES.includes(currentState);

  return (
    <div className="flex-1 min-w-0 rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
        {isFailed ? (
          <span className="text-xs text-red-400 font-medium">{currentState}</span>
        ) : (
          <span className={`text-xs font-medium ${colors.text}`}>
            {currentState.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* State nodes */}
      <div className="space-y-2">
        {states.map((s, i) => {
          const isDone = currentIndex > i;
          const isActive = currentIndex === i;
          const isPending = currentIndex < i;

          return (
            <div key={s} className="flex items-center gap-2.5">
              {/* Node */}
              <div className="relative shrink-0">
                {isActive && !isFailed ? (
                  <div className={`w-3 h-3 rounded-full ${colors.active} flex items-center justify-center`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.pulse} animate-pulse`} />
                  </div>
                ) : isDone ? (
                  <div className={`w-3 h-3 rounded-full ${colors.done} flex items-center justify-center`}>
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs truncate ${
                  isDone
                    ? 'text-zinc-400'
                    : isActive && !isFailed
                    ? 'text-white font-medium'
                    : 'text-zinc-600'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </span>
            </div>
          );
        })}

        {/* Failed state */}
        {isFailed && (
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-red-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold">✕</span>
            </div>
            <span className="text-xs text-red-400 font-medium">
              {currentState.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
