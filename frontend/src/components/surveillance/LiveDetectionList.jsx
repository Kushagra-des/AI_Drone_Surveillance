import React, { useState } from 'react';
import { useSurveillance } from '../../context/SurveillanceContext';
import { ClassBadge } from '../common/Badge';
import { Radar, Clock, Crosshair, ChevronRight } from 'lucide-react';
import Modal from '../common/Modal';

export default function LiveDetectionList({ maxHeight = 'max-h-[500px]' }) {
  const { detections, isMonitoring, wsConnectionStatus } = useSurveillance();
  const [selectedDetection, setSelectedDetection] = useState(null);

  return (
    <>
      <div className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Radar className={`w-4 h-4 ${isMonitoring ? 'text-emerald-400 animate-spin' : 'text-slate-500'}`} />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Live Ingestion Feed
            </h3>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-slate-400">STATUS:</span>
            <span className={`px-1.5 py-0.5 rounded border uppercase ${
              wsConnectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              wsConnectionStatus === 'mock_active' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {wsConnectionStatus}
            </span>
          </div>
        </div>

        {/* Scrollable list of detections */}
        <div className={`overflow-y-auto ${maxHeight} divide-y divide-slate-800/60 p-2 space-y-1`}>
          {detections.length === 0 ? (
            <div className="text-center py-10 text-xs font-mono text-slate-400">
              Awaiting detection triggers...
            </div>
          ) : (
            detections.slice(0, 30).map((det, index) => {
              const confPct = (det.confidence * 100).toFixed(0);
              const timeStr = new Date(det.timestamp).toLocaleTimeString();

              return (
                <div
                  key={det.id || index}
                  onClick={() => setSelectedDetection(det)}
                  className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-7 rounded-full bg-cyan-500/40 group-hover:bg-cyan-400 transition-colors"></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <ClassBadge className={det.class} />
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {confPct}%
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {timeStr}
                        </span>
                        <span>•</span>
                        <span>{det.source || 'drone_cam_1'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div className="hidden sm:block text-[10px] font-mono text-slate-400">
                      [{det.bbox ? det.bbox.join(', ') : '0,0,0,0'}]
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail inspection modal */}
      <Modal
        isOpen={!!selectedDetection}
        onClose={() => setSelectedDetection(null)}
        title="Detection Spatial & Model Telemetry"
      >
        {selectedDetection && (
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Record ID</span>
                <span className="text-sm font-bold text-cyan-300">{selectedDetection.id || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Confidence</span>
                <span className="text-sm font-bold text-emerald-400">
                  {(selectedDetection.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Object Class</span>
                <div className="mt-1">
                  <ClassBadge className={selectedDetection.class} />
                </div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Capture Source</span>
                <span className="text-slate-200 mt-1 block uppercase">{selectedDetection.source}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                YOLOv8 Bounding Box [x, y, w, h]
              </span>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-mono text-sm">
                JSON: {JSON.stringify(selectedDetection.bbox || [])}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-[11px]">
              <span className="text-slate-400 block text-[10px] uppercase">Timestamp (ISO 8601)</span>
              <span className="text-slate-200">{selectedDetection.timestamp}</span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
