import React from 'react';
import { useSurveillance } from '../../context/SurveillanceContext';
import { Server, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function ConnectionBanner() {
  const { isBackendConnected, isMockMode, refreshData } = useSurveillance();

  if (isBackendConnected) {
    return (
      <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2 text-xs flex items-center justify-between text-emerald-700">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Backend Connected: FastAPI YOLOv8 Pipeline Active</span>
        </div>
        <span className="text-[11px] text-emerald-400/70">Real-time Telemetry Synced</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-100 px-5 py-2.5 text-xs flex items-center justify-between text-amber-800">
      <div className="flex items-center gap-2.5">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
        <div>
          <span className="font-semibold text-amber-200">DEMO MODE ACTIVE:</span>{' '}
          <span className="text-amber-300/90">
            Backend at <code className="bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-700/50 text-amber-200">{import.meta.env.VITE_API_URL || 'http://localhost:8000'}</code> is currently offline. Simulating realistic drone AI telemetry.
          </span>
        </div>
      </div>
      <button
        onClick={refreshData}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors text-[11px]"
        title="Check backend connection"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Retry Link</span>
      </button>
    </div>
  );
}
