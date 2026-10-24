import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Car, 
  AlertTriangle, 
  ShieldCheck, 
  Video, 
  TrendingUp, 
  Activity,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useSurveillance } from '../context/SurveillanceContext';
import StatCard from '../components/common/StatCard';
import { SeverityBadge, ClassBadge } from '../components/common/Badge';
import VideoFeedPanel from '../components/surveillance/VideoFeedPanel';
import DroneTelemetryHUD from '../components/surveillance/DroneTelemetryHUD';
import { HOURLY_DETECTION_TRENDS, CLASS_DISTRIBUTION } from '../services/mockData';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export default function Dashboard() {
  const { 
    counters, 
    systemStatus, 
    alerts, 
    detections, 
    isMonitoring, 
    acknowledgeAlert 
  } = useSurveillance();

  const recentAlerts = alerts.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Detections"
          value={counters.total}
          icon={ShieldCheck}
          change="+18.4%"
          changeType="up"
          color="cyan"
          subtitle="All classified objects"
        />

        <StatCard
          title="Persons Tracked"
          value={counters.people}
          icon={Users}
          change="+12.1%"
          changeType="up"
          color="emerald"
          subtitle="Human pedestrian targets"
        />

        <StatCard
          title="Vehicles Logged"
          value={counters.vehicles}
          icon={Car}
          change="+6.3%"
          changeType="up"
          color="blue"
          subtitle="Cars, trucks & bikes"
        />

        <StatCard
          title="Active Alerts"
          value={counters.activeAlerts}
          icon={AlertTriangle}
          change={counters.activeAlerts > 0 ? "Requires review" : "Perimeter clean"}
          changeType={counters.activeAlerts > 0 ? "down" : "up"}
          color={counters.activeAlerts > 0 ? "rose" : "emerald"}
          subtitle="Restricted zone triggers"
        />
      </div>

      {/* Main Grid: Feed Preview + Recharts Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Stream Panel (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
                Primary Surveillance Feed
              </h2>
            </div>
            <Link
              to="/monitoring"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>Full Tactical Console</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <VideoFeedPanel height="h-[380px]" />
        </div>

        {/* Analytics & Distribution (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Class Distribution Chart Card */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Classification Breakdown
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                YOLOv8 Weights
              </span>
            </div>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CLASS_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {CLASS_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
              {CLASS_DISTRIBUTION.slice(0, 3).map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-400 truncate">{item.name}</span>
                  <span className="text-white font-bold ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drone Telemetry mini module */}
          <DroneTelemetryHUD />
        </div>
      </div>

      {/* Bottom Grid: Activity Chart & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Detection Activity Chart (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Surveillance Temporal Activity
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Cumulative hourly rate: Persons vs Vehicles
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                People
              </span>
              <span className="flex items-center gap-1 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Vehicles
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HOURLY_DETECTION_TRENDS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPeople" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Area type="monotone" dataKey="people" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorPeople)" />
                <Area type="monotone" dataKey="vehicles" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVehicles)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Alerts Feed (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  Critical Incidents
                </h3>
              </div>
              <Link
                to="/alerts"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors flex items-start justify-between gap-3 text-xs font-mono"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <span className="font-bold text-slate-200 truncate">{alert.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{alert.description}</p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span className="uppercase">{alert.source}</span>
                    </div>
                  </div>

                  {alert.status === 'active' && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-2 py-1 text-[10px] rounded bg-cyan-950 text-cyan-400 border border-cyan-800 hover:bg-cyan-900/50 transition-colors shrink-0"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
