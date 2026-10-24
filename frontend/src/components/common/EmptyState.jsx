import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = ShieldAlert, 
  title = 'No Records Found', 
  description = 'No surveillance items match the specified criteria.',
  actionLabel,
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
      <div className="p-4 rounded-full bg-slate-800/60 text-slate-400 mb-4 border border-slate-700/50">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black transition-all shadow-lg shadow-cyan-600/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
