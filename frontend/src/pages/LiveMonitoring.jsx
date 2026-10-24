import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  Video, 
  Layers, 
  Activity, 
  Settings2, 
  Radio, 
  RefreshCw,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import { useSurveillance } from '../context/SurveillanceContext';
import { useToast } from '../context/ToastContext';
import VideoFeedPanel from '../components/surveillance/VideoFeedPanel';
import DetectionCounters from '../components/surveillance/DetectionCounters';
import LiveDetectionList from '../components/surveillance/LiveDetectionList';
import DroneTelemetryHUD from '../components/surveillance/DroneTelemetryHUD';

export default function LiveMonitoring() {
  const { 
    isMonitoring, 
    startMonitoring, 
    stopMonitoring, 
    activeSource, 
    changeSource, 
    systemStatus,
    counters 
  } = useSurveillance();

  const { addToast } = useToast();
  const [isActionLoading, setIsActionLoading] = useState(false);

  const sources = [
    { id: 'drone_cam_1', label: 'Drone Gimbal 1 (Primary 4K RGB)', badge: 'AIRBORNE' },
    { id: 'drone_cam_2', label: 'Drone Gimbal 2 (Sector 2 East)', badge: 'AIRBORNE' },
    { id: 'simulated_stream', label: 'Synthetic Aerial Recon Simulation', badge: 'TESTBED' },
    { id: 'uploaded_video', label: 'Uploaded Flight Video Feed', badge: 'FILE' },
    { id: 'webcam', label: 'Local Sensor / USB Optical', badge: 'LOCAL' },
  ];

  const handleStart = async () => {
    setIsActionLoading(true);
    try {
      await startMonitoring(activeSource);
      addToast(`Surveillance activated on [${activeSource.toUpperCase()}]`, 'success');
    } catch (e) {
      addToast('Failed to start monitoring session', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStop = async () => {
    setIsActionLoading(true);
    try {
      await stopMonitoring();
      addToast('Surveillance session halted', 'warning');
    } catch (e) {
      addToast('Failed to stop monitoring session', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSourceChange = (e) => {
    const newSource = e.target.value;
    changeSource(newSource);
    addToast(`Switched feed source to ${newSource.toUpperCase()}`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 font-mono">
        {/* Source Selector */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
            <Video className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
              Active Video Feed Ingestion
            </label>
            <select
              value={activeSource}
              onChange={handleSourceChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.badge})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Start / Stop and Quick Toggles */}
        <div className="flex items-center gap-3">
          {isMonitoring ? (
            <button
              onClick={handleStop}
              disabled={isActionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-rose-950/50"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>TERMINATE MONITORING</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={isActionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-950/40"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>INITIALIZE MONITORING</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Counters */}
      <DetectionCounters />

      {/* Main Grid: Video Stream + Live Ingestion Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large Video Feed (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <VideoFeedPanel height="h-[520px]" />
          
          {/* Quick flight telemetry card below video feed */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase">Detection Engine</span>
              <div className="text-cyan-300 font-bold mt-0.5 truncate">Ultralytics YOLOv8</div>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase">Video Protocol</span>
              <div className="text-slate-200 font-bold mt-0.5">MJPEG / H.264</div>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase">Websocket Stream</span>
              <div className="text-emerald-400 font-bold mt-0.5">WS /ws/detections</div>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase">Inference Device</span>
              <div className="text-slate-200 font-bold mt-0.5">GPU / PyTorch</div>
            </div>
          </div>
        </div>

        {/* Live Detections Feed & Telemetry (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <LiveDetectionList maxHeight="max-h-[420px]" />
          <DroneTelemetryHUD />
        </div>
      </div>
    </div>
  );
}
