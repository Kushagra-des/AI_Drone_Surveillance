import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Server, 
  Sliders, 
  Volume2, 
  ShieldCheck, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Wifi,
  ExternalLink,
  Code
} from 'lucide-react';
import { useSurveillance } from '../context/SurveillanceContext';
import { useToast } from '../context/ToastContext';
import { getApiBaseUrl, getWsBaseUrl, getSystemStatus } from '../services/api';

export default function Settings() {
  const { 
    confidenceThreshold, 
    updateConfidenceThreshold,
    alertAudioEnabled,
    updateAlertAudio,
    monitoredClasses,
    updateMonitoredClasses,
    refreshData 
  } = useSurveillance();

  const { addToast } = useToast();

  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [wsUrl, setWsUrl] = useState(getWsBaseUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const availableClasses = [
    { id: 'person', label: 'Person (Pedestrian)' },
    { id: 'car', label: 'Car / Passenger Vehicle' },
    { id: 'truck', label: 'Truck / Logistics' },
    { id: 'motorcycle', label: 'Motorcycle' },
    { id: 'bicycle', label: 'Bicycle' },
    { id: 'bus', label: 'Transit Bus' },
  ];

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      localStorage.setItem('surveillance_api_url', apiUrl);
      const res = await getSystemStatus();
      if (!res.isMock) {
        setTestResult({
          success: true,
          message: 'Backend reached successfully! FastAPI & YOLOv8 responsive.',
        });
        addToast('FastAPI Backend connection successful!', 'success');
      } else {
        setTestResult({
          success: false,
          message: `Unable to reach ${apiUrl}. Running in Demo / Fallback mode.`,
        });
        addToast('Backend offline - Mock fallback active', 'warning');
      }
      refreshData();
    } catch (e) {
      setTestResult({
        success: false,
        message: 'Connection failed: ' + e.message,
      });
      addToast('Connection failed: ' + e.message, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveEndpoints = () => {
    localStorage.setItem('surveillance_api_url', apiUrl);
    localStorage.setItem('surveillance_ws_url', wsUrl);
    addToast('API & WebSocket endpoints saved', 'success');
    refreshData();
  };

  const handleToggleClass = (classId) => {
    let updated;
    if (monitoredClasses.includes(classId)) {
      if (monitoredClasses.length <= 1) {
        addToast('At least one class must remain active', 'warning');
        return;
      }
      updated = monitoredClasses.filter((c) => c !== classId);
    } else {
      updated = [...monitoredClasses, classId];
    }
    updateMonitoredClasses(updated);
  };

  const handleResetDefaults = () => {
    localStorage.removeItem('surveillance_api_url');
    localStorage.removeItem('surveillance_ws_url');
    localStorage.removeItem('surveillance_threshold');
    localStorage.removeItem('surveillance_audio_alerts');
    localStorage.removeItem('surveillance_classes');

    setApiUrl('http://localhost:8000');
    setWsUrl('ws://localhost:8000');
    updateConfidenceThreshold(0.50);
    updateAlertAudio(false);
    updateMonitoredClasses(['person', 'car', 'truck', 'motorcycle', 'bicycle']);

    setTestResult(null);
    addToast('Settings reset to system defaults', 'info');
    refreshData();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-mono text-xs">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Surveillance Station Parameters
            </h2>
            <p className="text-[10px] text-slate-400 font-sans">
              Configure backend FastAPI endpoints, YOLOv8 thresholds, and alert heuristics.
            </p>
          </div>
        </div>

        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-[11px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* API Configuration */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Server className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Backend API & WebSocket Contracts
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase text-slate-400 block mb-1">
              FastAPI Base URL (VITE_API_URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold disabled:opacity-50 transition-colors shrink-0"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>{isTesting ? 'Pinging...' : 'Test GET /api/status'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase text-slate-400 block mb-1">
              Detections WebSocket URL (VITE_WS_URL)
            </label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://localhost:8000"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveEndpoints}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save Endpoints</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Confidence & Detection Preferences */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            YOLOv8 Detection Thresholds
          </h3>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-slate-200 font-bold">Minimum Confidence Threshold</span>
              <p className="text-[10px] text-slate-400 font-sans">
                Only objects identified with confidence at or above this score are displayed and counted.
              </p>
            </div>
            <div className="text-base font-bold text-cyan-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              {(confidenceThreshold * 100).toFixed(0)}%
            </div>
          </div>

          <input
            type="range"
            min="0.10"
            max="0.95"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => updateConfidenceThreshold(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>10% (High Recall / Noise)</span>
            <span>50% (Recommended)</span>
            <span>95% (High Precision)</span>
          </div>
        </div>

        {/* Monitored Classes Checklist */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <label className="text-[10px] uppercase text-slate-400 block mb-1">
            Active Object Classification Whitelist
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableClasses.map((item) => {
              const isChecked = monitoredClasses.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleClass(item.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-200'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Audio & Alert Preferences */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Audio Alert System
          </h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-slate-200 font-bold">Synthesized Radar Audio Siren</span>
            <p className="text-[10px] text-slate-400 font-sans">
              Play high-frequency audio alert upon detecting critical perimeter breaches.
            </p>
          </div>
          <button
            onClick={() => updateAlertAudio(!alertAudioEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              alertAudioEnabled
                ? 'bg-emerald-500 text-black'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {alertAudioEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>
      </div>

      {/* Team Architecture & Ownership Boundary Guide */}
      <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <Code className="w-4 h-4" />
          <span>Team API Architecture & Module Ownership</span>
        </div>
        <div className="text-slate-400 text-[11px] font-sans space-y-1">
          <div>• <strong className="text-slate-200">Member 1 (Frontend):</strong> React + Vite + Tailwind UI (Owner of <code>frontend/</code>)</div>
          <div>• <strong className="text-slate-200">Member 2 (Backend):</strong> FastAPI REST & WebSockets (Owner of <code>backend/</code>)</div>
          <div>• <strong className="text-slate-200">Member 3 (AI & Sim):</strong> YOLOv8 Computer Vision Pipeline (Owner of <code>ai_model/</code>)</div>
        </div>
      </div>
    </div>
  );
}
