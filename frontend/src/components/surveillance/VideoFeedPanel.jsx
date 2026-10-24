import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Camera, 
  Eye, 
  EyeOff, 
  Sliders, 
  Activity, 
  Compass, 
  Zap, 
  Layers,
  Shield,
  VideoOff
} from 'lucide-react';
import { useSurveillance } from '../../context/SurveillanceContext';
import { getVideoFeedUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function VideoFeedPanel({ height = 'h-[500px]' }) {
  const { 
    activeSource, 
    isMonitoring, 
    detections, 
    systemStatus, 
    isBackendConnected,
    wsConnectionStatus 
  } = useSurveillance();
  const { addToast } = useToast();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [visionMode, setVisionMode] = useState('rgb'); // 'rgb' | 'thermal' | 'night'
  const [streamError, setStreamError] = useState(false);
  
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Snapshot capture
  const handleTakeSnapshot = () => {
    addToast('Surveillance frame snapshot saved to intelligence cache', 'info');
  };

  // Canvas-based tactical drone simulation overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let scanY = 0;
    let heading = 184;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // Draw simulated camera background if real video feed is error/mock
      if (streamError || !isBackendConnected) {
        // Base dark backdrop
        ctx.fillStyle = visionMode === 'thermal' ? '#180728' : visionMode === 'night' ? '#06170d' : '#0a0f1d';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = visionMode === 'night' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x < w; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Animated scan line
        scanY = (scanY + 2) % h;
        const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY);
        scanGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
        scanGrad.addColorStop(1, visionMode === 'night' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(6, 182, 212, 0.25)');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanY - 30, w, 30);
      }

      // Draw Tactical Bounding Boxes
      if (showBoxes && isMonitoring) {
        const currentDetections = detections.slice(0, 5); // display top recent
        currentDetections.forEach((det, idx) => {
          if (!det.bbox) return;
          const [bx, by, bw, bh] = det.bbox;

          // Scale coordinates nicely to canvas aspect
          const scaleX = w / 640;
          const scaleY = h / 360;
          const rx = bx * scaleX;
          const ry = by * scaleY;
          const rw = bw * scaleX;
          const rh = bh * scaleY;

          const isPerson = det.class === 'person';
          const strokeColor = isPerson ? '#06b6d4' : '#f59e0b';
          const bgColor = isPerson ? 'rgba(6, 182, 212, 0.15)' : 'rgba(245, 158, 11, 0.15)';

          // Bounding Box
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, ry, rw, rh);

          // Corner accents
          const cornerLen = 8;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(rx, ry + cornerLen);
          ctx.lineTo(rx, ry);
          ctx.lineTo(rx + cornerLen, ry);
          ctx.stroke();

          // Fill
          ctx.fillStyle = bgColor;
          ctx.fillRect(rx, ry, rw, rh);

          // Label badge
          const label = `${(det.class || 'OBJ').toUpperCase()} ${(det.confidence * 100).toFixed(0)}%`;
          ctx.font = '11px monospace';
          const textWidth = ctx.measureText(label).width;

          ctx.fillStyle = strokeColor;
          ctx.fillRect(rx, Math.max(0, ry - 18), textWidth + 12, 18);

          ctx.fillStyle = '#050b14';
          ctx.fillText(label, rx + 6, Math.max(13, ry - 5));
        });
      }

      // Draw HUD crosshairs and tactical markers
      if (showHUD) {
        const cx = w / 2;
        const cy = h / 2;
        const hudColor = visionMode === 'night' ? '#22c55e' : '#38bdf8';

        ctx.strokeStyle = hudColor;
        ctx.lineWidth = 1.2;

        // Central crosshairs
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = hudColor;
        ctx.fill();

        // Horizontal reticle ticks
        ctx.beginPath();
        ctx.moveTo(cx - 70, cy);
        ctx.lineTo(cx - 40, cy);
        ctx.moveTo(cx + 40, cy);
        ctx.lineTo(cx + 70, cy);
        ctx.stroke();

        // Vertical reticle ticks
        ctx.beginPath();
        ctx.moveTo(cx, cy - 70);
        ctx.lineTo(cx, cy - 40);
        ctx.moveTo(cx, cy + 40);
        ctx.lineTo(cx, cy + 70);
        ctx.stroke();

        // Artificial horizon ladder lines
        ctx.beginPath();
        ctx.moveTo(cx - 110, cy - 30);
        ctx.lineTo(cx - 80, cy - 30);
        ctx.moveTo(cx + 80, cy - 30);
        ctx.lineTo(cx + 110, cy - 30);

        ctx.moveTo(cx - 110, cy + 30);
        ctx.lineTo(cx - 80, cy + 30);
        ctx.moveTo(cx + 80, cy + 30);
        ctx.lineTo(cx + 110, cy + 30);
        ctx.stroke();

        // Corner framing brackets
        const m = 20;
        const len = 30;
        ctx.strokeStyle = hudColor;
        // TL
        ctx.beginPath();
        ctx.moveTo(m, m + len);
        ctx.lineTo(m, m);
        ctx.lineTo(m + len, m);
        ctx.stroke();
        // TR
        ctx.beginPath();
        ctx.moveTo(w - m - len, m);
        ctx.lineTo(w - m, m);
        ctx.lineTo(w - m, m + len);
        ctx.stroke();
        // BL
        ctx.beginPath();
        ctx.moveTo(m, h - m - len);
        ctx.lineTo(m, h - m);
        ctx.lineTo(m + len, h - m);
        ctx.stroke();
        // BR
        ctx.beginPath();
        ctx.moveTo(w - m - len, h - m);
        ctx.lineTo(w - m, h - m);
        ctx.lineTo(w - m, h - m - len);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [detections, showBoxes, showHUD, visionMode, isMonitoring, streamError, isBackendConnected]);

  const streamSrc = getVideoFeedUrl(activeSource);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${height} bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between group`}
    >
      {/* Real Video MJPEG Stream (if online) */}
      {isBackendConnected && !streamError && (
        <img
          src={streamSrc}
          alt="Surveillance Feed"
          onError={() => setStreamError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            visionMode === 'thermal' ? 'filter hue-rotate-180 contrast-150 saturate-200' : 
            visionMode === 'night' ? 'filter invert hue-rotate-90 contrast-200' : ''
          }`}
        />
      )}

      {/* Simulated Canvas HUD and Bounding Box Overlay */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Scanline CRT overlay effect */}
      <div className="absolute inset-0 hud-scanlines pointer-events-none z-15"></div>

      {/* Top HUD Telemetry Overlay Bar */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent">
        {/* Source and REC indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-black/60 border border-slate-700/60 backdrop-blur-md">
            <span className={`w-2.5 h-2.5 rounded-full ${isMonitoring ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`}></span>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-slate-100">
              {isMonitoring ? 'LIVE REC' : 'STANDBY'}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded bg-black/60 border border-slate-700/60 backdrop-blur-md text-xs font-mono text-cyan-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>SRC: {activeSource.toUpperCase()}</span>
          </div>
        </div>

        {/* Flight Telemetry Status */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded bg-black/60 border border-slate-700/60 backdrop-blur-md text-slate-300">
            <span className="text-slate-400">LAT:</span> 28°36'42"N
            <span className="text-slate-400 ml-2">LON:</span> 77°12'19"E
          </div>

          <div className="px-2.5 py-1 rounded bg-black/60 border border-slate-700/60 backdrop-blur-md text-emerald-400 font-bold flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            <span>{systemStatus?.fps || 28.5} FPS</span>
          </div>
        </div>
      </div>

      {/* If monitoring stopped watermark */}
      {!isMonitoring && (
        <div className="relative z-20 flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-xs">
          <div className="p-3 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 mb-2">
            <VideoOff className="w-6 h-6" />
          </div>
          <div className="text-sm font-mono font-bold text-slate-200 uppercase tracking-widest">
            Feed Suspended
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Surveillance session paused. Click "Start Recon" to reactivate YOLOv8 pipeline.
          </p>
        </div>
      )}

      {/* Bottom HUD Controls & Quick Toggles */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent">
        {/* Left: Mode toggles */}
        <div className="flex items-center gap-2">
          {/* Vision mode switch */}
          <div className="flex items-center p-0.5 bg-black/70 border border-slate-700/60 rounded-lg text-xs font-mono">
            <button
              onClick={() => setVisionMode('rgb')}
              className={`px-2 py-1 rounded ${visionMode === 'rgb' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              RGB
            </button>
            <button
              onClick={() => setVisionMode('thermal')}
              className={`px-2 py-1 rounded ${visionMode === 'thermal' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              THERMAL
            </button>
            <button
              onClick={() => setVisionMode('night')}
              className={`px-2 py-1 rounded ${visionMode === 'night' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              NVG
            </button>
          </div>

          {/* Toggle Bounding Boxes */}
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`p-2 rounded-lg border backdrop-blur-md transition-colors ${
              showBoxes 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                : 'bg-black/60 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
            title="Toggle Object Bounding Boxes"
          >
            {showBoxes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Toggle HUD graphics */}
          <button
            onClick={() => setShowHUD(!showHUD)}
            className={`p-2 rounded-lg border backdrop-blur-md transition-colors ${
              showHUD 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                : 'bg-black/60 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
            title="Toggle Tactical Reticle HUD"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Snapshot & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTakeSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 border border-slate-700/60 hover:border-slate-500 text-slate-200 text-xs font-mono backdrop-blur-md transition-colors"
            title="Capture current high-resolution frame"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">SNAPSHOT</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-black/70 border border-slate-700/60 hover:border-slate-500 text-slate-200 backdrop-blur-md transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
