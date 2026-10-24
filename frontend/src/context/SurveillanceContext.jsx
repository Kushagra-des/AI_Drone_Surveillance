import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  getSystemStatus, 
  startMonitoringSession, 
  stopMonitoringSession, 
  getDetections, 
  getAlerts 
} from '../services/api';
import { DetectionsWebSocketManager } from '../services/websocket';
import { INITIAL_SYSTEM_STATUS, INITIAL_ALERTS, INITIAL_DETECTIONS } from '../services/mockData';

const SurveillanceContext = createContext(null);

export function SurveillanceProvider({ children }) {
  const [systemStatus, setSystemStatus] = useState(INITIAL_SYSTEM_STATUS);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [activeSource, setActiveSource] = useState('drone_cam_1');
  const [detections, setDetections] = useState(INITIAL_DETECTIONS);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isMockMode, setIsMockMode] = useState(true);
  const [wsConnectionStatus, setWsConnectionStatus] = useState('connecting');
  const [isLoading, setIsLoading] = useState(true);

  // Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState(() => {
    return parseFloat(localStorage.getItem('surveillance_threshold')) || 0.50;
  });
  const [alertAudioEnabled, setAlertAudioEnabled] = useState(() => {
    return localStorage.getItem('surveillance_audio_alerts') === 'true';
  });
  const [monitoredClasses, setMonitoredClasses] = useState(() => {
    try {
      const saved = localStorage.getItem('surveillance_classes');
      return saved ? JSON.parse(saved) : ['person', 'car', 'truck', 'motorcycle', 'bicycle'];
    } catch {
      return ['person', 'car', 'truck', 'motorcycle', 'bicycle'];
    }
  });

  const wsRef = useRef(null);

  // Sound effect helper (synthetic audio beep using Web Audio API)
  const playAlertSound = useCallback((frequency = 880, duration = 0.15) => {
    if (!alertAudioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext may be restricted by browser autoplay policy
    }
  }, [alertAudioEnabled]);

  // Derived real-time counters
  const counters = {
    total: detections.length,
    people: detections.filter((d) => d.class === 'person').length,
    vehicles: detections.filter((d) => ['car', 'truck', 'motorcycle', 'bus'].includes(d.class)).length,
    activeAlerts: alerts.filter((a) => a.status === 'active').length,
  };

  // Add a newly received detection
  const handleNewDetection = useCallback((detection, isFromMock = false) => {
    // Only accept if above confidence threshold
    if (detection.confidence < confidenceThreshold) return;

    // Only accept if class is among monitored classes
    if (monitoredClasses.length > 0 && !monitoredClasses.includes(detection.class)) return;

    setDetections((prev) => [detection, ...prev.slice(0, 199)]); // keep recent 200

    // Auto-generate high-confidence or intrusion alerts occasionally
    if (detection.confidence >= 0.88 && Math.random() > 0.85) {
      const isCritical = detection.confidence >= 0.93;
      const newAlert = {
        id: `ALT-${Math.floor(1100 + Math.random() * 8900)}`,
        title: isCritical ? `Critical: ${detection.class.toUpperCase()} in Restricted Zone` : `Elevated Alert: High Confidence ${detection.class}`,
        severity: isCritical ? 'critical' : 'high',
        category: 'Perimeter Anomaly',
        description: `Autonomous detection of ${detection.class} with ${(detection.confidence * 100).toFixed(0)}% confidence at ${detection.zone || 'Target Perimeter'}.`,
        timestamp: new Date().toISOString(),
        source: detection.source || activeSource,
        status: 'active',
        confidence: detection.confidence,
        class: detection.class,
      };

      setAlerts((prev) => [newAlert, ...prev]);
      playAlertSound(isCritical ? 1040 : 880);
    }
  }, [confidenceThreshold, monitoredClasses, activeSource, playAlertSound]);

  // Fetch initial data from backend or fallback to mock
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statusRes, detectionsRes, alertsRes] = await Promise.all([
        getSystemStatus(),
        getDetections(),
        getAlerts(),
      ]);

      setSystemStatus(statusRes.data);
      setIsBackendConnected(!statusRes.isMock);
      setIsMockMode(statusRes.isMock);

      if (detectionsRes.data && detectionsRes.data.length > 0) {
        setDetections(detectionsRes.data);
      }
      if (alertsRes.data && alertsRes.data.length > 0) {
        setAlerts(alertsRes.data);
      }
    } catch (err) {
      console.error('[SurveillanceContext] Initial fetch failed:', err);
      setIsBackendConnected(false);
      setIsMockMode(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Manage WebSocket connection for live monitoring
  useEffect(() => {
    if (!isMonitoring) {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      return;
    }

    const wsManager = new DetectionsWebSocketManager({
      source: activeSource,
      enableMockFallback: true,
      onDetection: (detection, isMock) => {
        handleNewDetection(detection, isMock);
      },
      onStatusChange: (status) => {
        setWsConnectionStatus(status);
      },
    });

    wsRef.current = wsManager;
    wsManager.connect();

    return () => {
      wsManager.disconnect();
    };
  }, [isMonitoring, activeSource, handleNewDetection]);

  // Actions
  const startMonitoring = async (source = activeSource) => {
    const res = await startMonitoringSession({ source });
    setIsMonitoring(true);
    return res;
  };

  const stopMonitoring = async () => {
    const res = await stopMonitoringSession();
    setIsMonitoring(false);
    return res;
  };

  const changeSource = (source) => {
    setActiveSource(source);
    if (wsRef.current) {
      wsRef.current.setSource(source);
    }
  };

  const acknowledgeAlert = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged' } : a))
    );
  };

  const resolveAlert = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'resolved' } : a))
    );
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const updateConfidenceThreshold = (val) => {
    setConfidenceThreshold(val);
    localStorage.setItem('surveillance_threshold', val.toString());
  };

  const updateAlertAudio = (val) => {
    setAlertAudioEnabled(val);
    localStorage.setItem('surveillance_audio_alerts', val.toString());
  };

  const updateMonitoredClasses = (classList) => {
    setMonitoredClasses(classList);
    localStorage.setItem('surveillance_classes', JSON.stringify(classList));
  };

  return (
    <SurveillanceContext.Provider
      value={{
        systemStatus,
        isMonitoring,
        activeSource,
        detections,
        alerts,
        counters,
        isBackendConnected,
        isMockMode,
        wsConnectionStatus,
        isLoading,
        confidenceThreshold,
        alertAudioEnabled,
        monitoredClasses,
        startMonitoring,
        stopMonitoring,
        changeSource,
        acknowledgeAlert,
        resolveAlert,
        clearAlerts,
        updateConfidenceThreshold,
        updateAlertAudio,
        updateMonitoredClasses,
        refreshData: fetchAllData,
      }}
    >
      {children}
    </SurveillanceContext.Provider>
  );
}

export function useSurveillance() {
  const context = useContext(SurveillanceContext);
  if (!context) {
    throw new Error('useSurveillance must be used within a SurveillanceProvider');
  }
  return context;
}
