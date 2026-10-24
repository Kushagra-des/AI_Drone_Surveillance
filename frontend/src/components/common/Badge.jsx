import React from 'react';

export function ClassBadge({ className, size = 'sm' }) {
  const normalized = (className || '').toLowerCase();
  
  const styles = {
    person: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    car: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    truck: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    motorcycle: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    bicycle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bus: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    drone: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    default: 'bg-slate-700/30 text-slate-300 border-slate-600/40',
  };

  const badgeStyle = styles[normalized] || styles.default;
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 font-mono uppercase tracking-wider rounded border font-medium ${sizeClasses} ${badgeStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {normalized}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const norm = (severity || 'low').toLowerCase();

  const styles = {
    critical: 'bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse',
    high: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    medium: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    low: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded-md border font-semibold ${styles[norm] || styles.low}`}>
      <span className="w-2 h-2 rounded-full bg-current"></span>
      {norm}
    </span>
  );
}

export function StatusBadge({ status }) {
  const norm = (status || '').toLowerCase();

  const styles = {
    active: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    acknowledged: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    online: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    offline: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-mono capitalize rounded border ${styles[norm] || styles.offline}`}>
      {norm}
    </span>
  );
}
