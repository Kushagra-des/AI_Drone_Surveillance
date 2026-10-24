import React from 'react';
import { useSurveillance } from '../../context/SurveillanceContext';
import { Compass, BatteryCharging, Radio, Navigation, Wind, Cpu } from 'lucide-react';

export default function DroneTelemetryHUD() {
  const { systemStatus } = useSurveillance();

  const battery = systemStatus?.battery_level || 84;
  const altitude = systemStatus?.altitude_m || 45.2;
  const speed = systemStatus?.speed_mps || 12.4;
  const signal = systemStatus?.signal_quality || 94;

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <span className="font-bold uppercase tracking-wider text-slate-200">
            UAV Telemetry Computer
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          LINK STABLE
        </span>
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-2 gap-3">
        {/* Altitude */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Altitude (AGL)</div>
          <div className="text-lg font-bold text-cyan-400 mt-0.5">{altitude} m</div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-cyan-500 h-full" style={{ width: `${Math.min(100, (altitude / 100) * 100)}%` }}></div>
          </div>
        </div>

        {/* Speed */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Ground Speed</div>
          <div className="text-lg font-bold text-cyan-400 mt-0.5">{speed} m/s</div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-cyan-500 h-full" style={{ width: `${Math.min(100, (speed / 30) * 100)}%` }}></div>
          </div>
        </div>

        {/* Battery */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Battery</span>
            <BatteryCharging className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">{battery}%</div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${battery}%` }}></div>
          </div>
        </div>

        {/* RF Signal */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Link Quality</span>
            <Radio className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-cyan-400 mt-0.5">{signal}%</div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-cyan-500 h-full" style={{ width: `${signal}%` }}></div>
          </div>
        </div>
      </div>

      {/* GPS & Heading summary */}
      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>COORDINATES:</span>
          <span className="text-slate-200">28.6139° N, 77.2090° E</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>AI ACCELERATOR:</span>
          <span className="text-slate-200">{systemStatus?.ai_model?.device || 'CUDA GPU'}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>INFERENCE LATENCY:</span>
          <span className="text-emerald-400 font-bold">{systemStatus?.ai_model?.inference_time_ms || 14.2} ms</span>
        </div>
      </div>
    </div>
  );
}
