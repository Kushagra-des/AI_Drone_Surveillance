import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Volume2, 
  VolumeX, 
  CheckCheck,
  Radio,
  ExternalLink
} from 'lucide-react';
import { useSurveillance } from '../context/SurveillanceContext';
import { SeverityBadge, StatusBadge, ClassBadge } from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';

export default function Alerts() {
  const { 
    alerts, 
    acknowledgeAlert, 
    resolveAlert, 
    clearAlerts,
    alertAudioEnabled,
    updateAlertAudio 
  } = useSurveillance();

  const { addToast } = useToast();

  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const matchStatus = statusFilter === 'all' || alert.status === statusFilter;
      return matchSeverity && matchStatus;
    });
  }, [alerts, severityFilter, statusFilter]);

  const handleAcknowledgeAll = () => {
    alerts.forEach((a) => {
      if (a.status === 'active') acknowledgeAlert(a.id);
    });
    addToast('All active alerts marked as acknowledged', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Status */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Autonomous Incident Center
            </h2>
            <p className="text-[10px] text-slate-400">
              Perimeter security breaches & high-confidence anomalies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button
            onClick={() => {
              updateAlertAudio(!alertAudioEnabled);
              addToast(`Audible alerts ${!alertAudioEnabled ? 'enabled' : 'disabled'}`, 'info');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
              alertAudioEnabled 
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle siren alert sound on critical detection"
          >
            {alertAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Audio Siren: {alertAudioEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Mark All Acknowledged */}
          <button
            onClick={handleAcknowledgeAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Acknowledge All</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        {/* Severity filter pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-lg">
          {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-md uppercase text-[11px] font-bold transition-colors ${
                severityFilter === sev
                  ? 'bg-cyan-500 text-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-lg">
          {['all', 'active', 'acknowledged', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md uppercase text-[11px] font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-cyan-500 text-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Cards Grid */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No Matching Incidents"
          description="Perimeter is currently clear of alerts matching the selected filters."
          actionLabel="Show All Alerts"
          onAction={() => {
            setSeverityFilter('all');
            setStatusFilter('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            return (
              <div
                key={alert.id}
                className={`p-5 rounded-xl border backdrop-blur-md flex flex-col justify-between font-mono space-y-4 transition-all duration-200 ${
                  isCritical
                    ? 'bg-slate-900/80 border-rose-500/40 shadow-lg shadow-rose-950/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <StatusBadge status={alert.status} />
                    </div>
                    <h3 className="text-sm font-bold text-white pt-1">{alert.title}</h3>
                  </div>
                  <span className="text-[10px] text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {alert.id}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {alert.description}
                </p>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-right uppercase text-slate-300">
                    SRC: {alert.source || 'drone_cam_1'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  {alert.class && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 uppercase">Target:</span>
                      <ClassBadge className={alert.class} size="xs" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {alert.status === 'active' && (
                      <button
                        onClick={() => {
                          acknowledgeAlert(alert.id);
                          addToast(`Alert ${alert.id} acknowledged`, 'info');
                        }}
                        className="px-3 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}

                    {alert.status !== 'resolved' && (
                      <button
                        onClick={() => {
                          resolveAlert(alert.id);
                          addToast(`Alert ${alert.id} marked as resolved`, 'success');
                        }}
                        className="px-3 py-1 text-xs rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
