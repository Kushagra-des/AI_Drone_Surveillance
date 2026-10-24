import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType = 'up', 
  color = 'cyan', 
  subtitle,
  activeDot = false
}) {
  const colorMap = {
    cyan: 'border-cyan-500/20 bg-cyan-950/20 text-cyan-400 group-hover:border-cyan-500/50',
    emerald: 'border-emerald-500/20 bg-emerald-950/20 text-emerald-400 group-hover:border-emerald-500/50',
    blue: 'border-blue-500/20 bg-blue-950/20 text-blue-400 group-hover:border-blue-500/50',
    amber: 'border-amber-500/20 bg-amber-950/20 text-amber-400 group-hover:border-amber-500/50',
    rose: 'border-rose-500/20 bg-rose-950/20 text-rose-400 group-hover:border-rose-500/50',
  };

  const iconBgMap = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  };

  return (
    <div className={`relative group p-5 rounded-xl border bg-slate-900/60 backdrop-blur-md transition-all duration-200 hover:shadow-lg hover:shadow-cyan-950/20 ${colorMap[color] || colorMap.cyan}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
          {activeDot && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconBgMap[color] || iconBgMap.cyan}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-3xl font-bold font-mono tracking-tight text-white">
          {value}
        </div>
        {change && (
          <div className={`flex items-center text-xs font-mono font-medium ${changeType === 'up' ? 'text-emerald-400' : 'text-slate-400'}`}>
            {changeType === 'up' ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
            {change}
          </div>
        )}
      </div>

      {subtitle && (
        <div className="mt-2 text-xs text-slate-400 font-mono">
          {subtitle}
        </div>
      )}

      {/* Decorative corner reticle */}
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-500/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-500/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
}
