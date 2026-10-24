import React from 'react';
import { useSurveillance } from '../../context/SurveillanceContext';
import { Users, Car, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DetectionCounters() {
  const { counters, isMonitoring } = useSurveillance();

  const metrics = [
    {
      label: 'Persons In View',
      value: counters.people,
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-950/30 border-cyan-500/30',
    },
    {
      label: 'Vehicles Tracked',
      value: counters.vehicles,
      icon: Car,
      color: 'text-blue-400',
      bg: 'bg-blue-950/30 border-blue-500/30',
    },
    {
      label: 'Total Classified',
      value: counters.total,
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/30 border-emerald-500/30',
    },
    {
      label: 'Active Alerts',
      value: counters.activeAlerts,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-950/30 border-rose-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className={`p-3.5 rounded-xl border backdrop-blur-md flex items-center justify-between ${m.bg}`}
          >
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                {m.label}
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-white mt-0.5">
                {m.value}
              </div>
            </div>
            <div className={`p-2 rounded-lg bg-black/40 border border-slate-800 ${m.color}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
