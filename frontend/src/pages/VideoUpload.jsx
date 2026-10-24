import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  FileVideo, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Trash2, 
  Film,
  Cpu,
  Clock
} from 'lucide-react';
import { uploadVideoFile } from '../services/api';
import { useSurveillance } from '../context/SurveillanceContext';
import { useToast } from '../context/ToastContext';

export default function VideoUpload() {
  const { changeSource, startMonitoring } = useSurveillance();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState([
    {
      id: 'VID-REC-01',
      name: 'drone_flight_sector3_perim.mp4',
      size: '28.4 MB',
      duration: '04:12',
      status: 'Ready for YOLOv8',
      uploadedAt: '15 mins ago',
    },
    {
      id: 'VID-REC-02',
      name: 'runway_night_recon_cam2.avi',
      size: '54.1 MB',
      duration: '08:45',
      status: 'Ready for YOLOv8',
      uploadedAt: '1 hour ago',
    },
  ]);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    if (!file) return;
    const validExtensions = ['.mp4', '.avi', '.mov', '.mkv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      addToast('Invalid file format. Please upload MP4, AVI, MOV or MKV video.', 'error');
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const res = await uploadVideoFile(selectedFile, (percent) => {
        setUploadProgress(percent);
      });

      const newUpload = {
        id: res.data.file_id || `VID-${Date.now().toString(36).toUpperCase()}`,
        name: selectedFile.name,
        size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        duration: 'Recorded Clip',
        status: 'Ready for YOLOv8',
        uploadedAt: 'Just now',
      };

      setRecentUploads((prev) => [newUpload, ...prev]);
      addToast(`Video "${selectedFile.name}" uploaded successfully!`, 'success');
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (error) {
      addToast('Upload failed: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunInMonitoring = (video) => {
    changeSource('uploaded_video');
    startMonitoring('uploaded_video');
    addToast(`Switched live recon pipeline to video: ${video.name}`, 'success');
    navigate('/monitoring');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Info */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md font-mono flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            Recorded Video Ingestion Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Upload prerecorded drone missions or perimeter footage for post-flight YOLOv8 analysis.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-800/40">
          <Cpu className="w-4 h-4" />
          <span>YOLOv8 Batch Inference</span>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-cyan-400 bg-cyan-950/20 shadow-xl shadow-cyan-950/30'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.avi,.mov,.mkv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
            <UploadCloud className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-bold text-white font-mono">
              Drag & Drop Drone Surveillance Video File
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports <span className="text-cyan-400 font-mono">.MP4, .AVI, .MOV, .MKV</span> (Max file size 500MB)
            </p>
          </div>

          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
          >
            Browse Local Media
          </button>
        </div>
      </div>

      {/* Selected File & Upload Trigger */}
      {selectedFile && (
        <div className="p-5 rounded-xl bg-slate-900/90 border border-cyan-500/40 backdrop-blur-md font-mono space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileVideo className="w-8 h-8 text-cyan-400" />
              <div>
                <div className="text-xs font-bold text-white truncate max-w-md">
                  {selectedFile.name}
                </div>
                <div className="text-[10px] text-slate-400">
                  Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for ingestion
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
                className="px-3 py-1.5 text-xs rounded-lg text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-cyan-950"
              >
                {isUploading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    <span>Uploading ({uploadProgress}%)</span>
                  </>
                ) : (
                  <span>POST /api/videos/upload</span>
                )}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Streaming frames to FastAPI endpoint...</span>
                <span>{uploadProgress}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Uploaded Videos List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md font-mono">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Ingested Surveillance Archives
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">{recentUploads.length} Files Available</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {recentUploads.map((video) => (
            <div
              key={video.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{video.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{video.size}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {video.uploadedAt}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {video.status}
                </span>

                <button
                  onClick={() => handleRunInMonitoring(video)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-md shadow-cyan-950"
                  title="Run real-time YOLOv8 detection on this video stream"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Stream & Detect</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
