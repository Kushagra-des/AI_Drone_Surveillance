import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  History, 
  AlertTriangle, 
  UploadCloud, 
  Settings, 
  Radio, 
  Cpu, 
  BatteryMedium,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useSurveillance } from '../../context/SurveillanceContext';

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const { counters, systemStatus, isMonitoring } = useSurveillance();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Live Monitoring', path: '/monitoring', icon: Video, badge: isMonitoring ? 'LIVE' : null, badgeColor: 'bg-emerald-500 text-black' },
    { name: 'Detection History', path: '/history', icon: History, count: counters.total },
    { name: 'Alerts Center', path: '/alerts', icon: AlertTriangle, count: counters.activeAlerts, countColor: counters.activeAlerts > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : null },
    { name: 'Video Upload', path: '/upload', icon: UploadCloud },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col justify-between bg-slate-950/95 border-r border-slate-800/80 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top Header / Branding */}
        <div>
          <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 shrink-0">
                <Radio className="w-5 h-5 animate-pulse text-cyan-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
              </div>
              
              {!isCollapsed && (
                <div className="truncate">
                  <div className="text-sm font-bold tracking-wider font-mono text-white flex items-center gap-1.5">
                    <span>AERO-EYE</span>
                    <span className="text-[10px] px-1 py-0.2 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">v1.0</span>
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 truncate">
                    AI Drone Surveillance
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-slate-800 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium font-mono transition-all duration-150 ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-950'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105" />
                  
                  {!isCollapsed && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{item.name}</span>
                      
                      {item.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}

                      {item.count !== undefined && (
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                            item.countColor || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tooltip on collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-slate-200 text-xs rounded-md shadow-xl border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Hardware / Telemetry Telemetry Status */}
        <div className="p-3 border-t border-slate-800/80">
          {!isCollapsed ? (
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  AI Engine
                </span>
                <span className="text-cyan-300 font-semibold truncate max-w-[100px]">
                  {systemStatus?.ai_model?.name || 'YOLOv8x'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
                  Drone Battery
                </span>
                <span className="text-emerald-400 font-semibold">
                  {systemStatus?.battery_level || 84}%
                </span>
              </div>

              <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[10px]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Minor Project C2
                </span>
                <span className="text-slate-400">Team Feature</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2 text-cyan-400">
              <Cpu className="w-4 h-4" title="YOLOv8 AI Engine" />
              <BatteryMedium className="w-4 h-4 text-emerald-400" title="Drone Battery: 84%" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
