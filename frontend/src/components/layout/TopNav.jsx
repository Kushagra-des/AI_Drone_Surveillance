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
      case '/': return { title: 'Overview', subtitle: 'A quick look at your drone activity' };
      case '/monitoring': return { title: 'Live monitoring', subtitle: 'Watch and manage the current feed' };
      case '/history': return { title: 'Detection history', subtitle: 'Review objects found in previous sessions' };
      case '/alerts': return { title: 'Alerts', subtitle: 'Review events that may need attention' };
      case '/upload': return { title: 'Upload video', subtitle: 'Analyze a recorded flight' };
      case '/settings': return { title: 'Settings', subtitle: 'Manage your monitoring preferences' };
      default: return { title: 'Skywatch', subtitle: 'Drone monitoring' };
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
    <header className="min-h-20 px-5 md:px-8 bg-white border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30">
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
          <h1 className="text-base md:text-lg font-semibold text-slate-100 flex items-center gap-2">
            {title}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block mt-0.5">
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
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 shadow-sm ${
            isMonitoring
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
