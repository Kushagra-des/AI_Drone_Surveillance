import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Clock, 
  SlidersHorizontal, 
  Eye, 
  FileJson, 
  FileSpreadsheet,
  RefreshCw,
  Layers
} from 'lucide-react';
import { useSurveillance } from '../context/SurveillanceContext';
import { ClassBadge } from '../components/common/Badge';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';

export default function DetectionHistory() {
  const { detections, refreshData } = useSurveillance();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [selectedSource, setSelectedSource] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [inspectedDetection, setInspectedDetection] = useState(null);

  // Filtered dataset
  const filteredDetections = useMemo(() => {
    return detections.filter((item) => {
      // Query filter
      const q = searchQuery.toLowerCase();
      const matchesQuery = 
        !q ||
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.class && item.class.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q)) ||
        (item.zone && item.zone.toLowerCase().includes(q));

      // Class filter
      const matchesClass = selectedClass === 'all' || item.class === selectedClass;

      // Confidence filter
      const matchesConf = item.confidence >= minConfidence;

      // Source filter
      const matchesSource = selectedSource === 'all' || item.source === selectedSource;

      return matchesQuery && matchesClass && matchesConf && matchesSource;
    });
  }, [detections, searchQuery, selectedClass, minConfidence, selectedSource]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredDetections.length / itemsPerPage) || 1;
  const paginatedDetections = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDetections.slice(start, start + itemsPerPage);
  }, [filteredDetections, currentPage, itemsPerPage]);

  // Export functions
  const exportToJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredDetections, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `drone_detections_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast(`Exported ${filteredDetections.length} records to JSON`, 'success');
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Class', 'Confidence', 'BBox_X', 'BBox_Y', 'BBox_W', 'BBox_H', 'Source', 'Timestamp', 'Zone'];
    const rows = filteredDetections.map((d) => [
      d.id || '',
      d.class,
      d.confidence,
      d.bbox ? d.bbox[0] : '',
      d.bbox ? d.bbox[1] : '',
      d.bbox ? d.bbox[2] : '',
      d.bbox ? d.bbox[3] : '',
      d.source || '',
      d.timestamp,
      d.zone || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `drone_detections_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    addToast(`Exported ${filteredDetections.length} records to CSV`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4 font-mono">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, Class, Zone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Action buttons: Export & Refresh */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={exportToJSON}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700"
              title="Export filtered records to JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-cyan-400" />
              <span>JSON</span>
            </button>

            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700"
              title="Export filtered records to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => {
                refreshData();
                addToast('Detection records refreshed', 'info');
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700"
              title="Refresh Records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Badges / Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          {/* Class Filter */}
          <div>
            <label className="text-[10px] uppercase text-slate-400 block mb-1">Target Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Object Classes</option>
              <option value="person">Person</option>
              <option value="car">Car</option>
              <option value="truck">Truck</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="bicycle">Bicycle</option>
            </select>
          </div>

          {/* Min Confidence Slider */}
          <div>
            <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 mb-1">
              <span>Min Confidence</span>
              <span className="text-cyan-400 font-bold">{(minConfidence * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.95"
              step="0.05"
              value={minConfidence}
              onChange={(e) => {
                setMinConfidence(parseFloat(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Source Filter */}
          <div>
            <label className="text-[10px] uppercase text-slate-400 block mb-1">Source Camera</label>
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Sources</option>
              <option value="drone_cam_1">Drone Cam 1</option>
              <option value="drone_cam_2">Drone Cam 2</option>
              <option value="uploaded_video">Uploaded Video</option>
            </select>
          </div>
        </div>
      </div>

      {/* Detections Data Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md">
        {filteredDetections.length === 0 ? (
          <EmptyState
            title="No Detections Found"
            description="No surveillance events match the query and filter parameters."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedClass('all');
              setMinConfidence(0.5);
              setSelectedSource('all');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Record ID</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Bounding Box [x, y, w, h]</th>
                  <th className="px-4 py-3">Sensor Source</th>
                  <th className="px-4 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedDetections.map((det) => {
                  const confPct = (det.confidence * 100).toFixed(1);
                  return (
                    <tr
                      key={det.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setInspectedDetection(det)}
                    >
                      <td className="px-4 py-3 font-bold text-cyan-400">
                        {det.id}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(det.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ClassBadge className={det.class} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-400"
                              style={{ width: `${confPct}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-slate-200">{confPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        [{det.bbox ? det.bbox.join(', ') : '0, 0, 0, 0'}]
                      </td>
                      <td className="px-4 py-3 text-slate-300 uppercase text-[11px]">
                        {det.source || 'drone_cam_1'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedDetection(det);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredDetections.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/40 text-xs font-mono gap-3">
            <div className="text-slate-400 text-[11px]">
              Showing <span className="text-white font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="text-white font-bold">
                {Math.min(currentPage * itemsPerPage, filteredDetections.length)}
              </span>{' '}
              of <span className="text-white font-bold">{filteredDetections.length}</span> detections
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-slate-400 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      <Modal
        isOpen={!!inspectedDetection}
        onClose={() => setInspectedDetection(null)}
        title="Detection Telemetry & Bounding Box Inspection"
      >
        {inspectedDetection && (
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">ID</span>
                <span className="text-sm font-bold text-cyan-400">{inspectedDetection.id}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Class</span>
                <div className="mt-1">
                  <ClassBadge className={inspectedDetection.class} />
                </div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Confidence</span>
                <span className="text-sm font-bold text-emerald-400">
                  {(inspectedDetection.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase mb-1">
                API Standard Bounding Box Schema: [x, y, width, height]
              </span>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-xs">
                {JSON.stringify(inspectedDetection.bbox)}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Capture Camera:</span>
                <span className="text-slate-200 uppercase">{inspectedDetection.source}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Timestamp:</span>
                <span className="text-slate-200">{inspectedDetection.timestamp}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Zone Assignment:</span>
                <span className="text-slate-200">{inspectedDetection.zone || 'Sector Alpha'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
