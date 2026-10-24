import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Menu, 
  Play, 
  Square, 
  Wifi, 
  Activity, 
  Gauge, 
  Layers, 
  Bell, 
  Compass,
  Clock
} from 'lucide-react';
import { useSurveillance } from '../../context/SurveillanceContext';
import { useToast } from '../../context/ToastContext';

export default function TopNav({ setIsMobileOpen }) {
  const location = useLocation();
  const { 
    isMonitoring, 
    startMonitoring, 
    stopMonitoring, 
    systemStatus, 
    isBackendConnected,
    counters 
  } = useSurveillance();
  const { addToast } = useToast();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/': return { title: 'SURVEILLANCE DASHBOARD', subtitle: 'Global System Overview & Analytics' };
      case '/monitoring': return { title: 'LIVE FEED & TACTICAL RECON', subtitle: 'Real-time Object Detection Stream' };
      case '/history': return { title: 'DETECTION LOG ARCHIVE', subtitle: 'Object Records & Spatial Analysis' };
      case '/alerts': return { title: 'INCIDENT & ALERT CENTER', subtitle: 'Automated Perimeter Violations' };
      case '/upload': return { title: 'VIDEO ANALYSIS PIPELINE', subtitle: 'Recorded Flight Video Ingestion' };
      case '/settings': return { title: 'MISSION CONFIGURATION', subtitle: 'Parameters, Model & API Endpoints' };
      default: return { title: 'AI DRONE SURVEILLANCE', subtitle: 'Command & Control' };
    }
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      await stopMonitoring();
      addToast('Surveillance monitoring stopped', 'warning');
    } else {
      await startMonitoring();
      addToast('Live surveillance monitoring activated', 'success');
    }
  };

  return (
    <header className="h-16 px-4 md:px-6 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm md:text-base font-bold font-mono tracking-wider text-slate-100 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            {title}
          </h1>
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Telemetry & Controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Real-time Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{currentTime.toLocaleTimeString()} UTC</span>
        </div>

        {/* Drone Telemetry Quick Badges */}
        <div className="hidden xl:flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">ALT:</span>
            <span className="text-cyan-300 font-bold">{systemStatus?.altitude_m || 45.2}m</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">FPS:</span>
            <span className="text-emerald-400 font-bold">{systemStatus?.fps || 28.5}</span>
          </div>
        </div>

        {/* Backend State Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono">
          <Wifi className={`w-3.5 h-3.5 ${isBackendConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="hidden sm:inline text-slate-400">API:</span>
          <span className={isBackendConnected ? 'text-emerald-400 font-medium' : 'text-amber-300 font-medium'}>
            {isBackendConnected ? 'ONLINE' : 'DEMO'}
          </span>
        </div>

        {/* Start / Stop Monitoring Action Button */}
        <button
          onClick={handleToggleMonitoring}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all duration-150 shadow-md ${
            isMonitoring
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/50 hover:shadow-rose-950/50'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/40'
          }`}
        >
          {isMonitoring ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">STOP STREAM</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">START RECON</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
