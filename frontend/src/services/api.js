import axios from 'axios';
import { 
  INITIAL_SYSTEM_STATUS, 
  INITIAL_DETECTIONS, 
  INITIAL_ALERTS, 
  generateRandomDetection 
} from './mockData';

// Retrieve configured API base URL (falls back to env or default localhost:8000)
export function getApiBaseUrl() {
  return localStorage.getItem('surveillance_api_url') || 
         import.meta.env.VITE_API_URL || 
         'http://localhost:8000';
}

// Retrieve configured WS base URL
export function getWsBaseUrl() {
  const customWs = localStorage.getItem('surveillance_ws_url');
  if (customWs) return customWs;
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace(/^http/, 'ws');
}

// Create centralized Axios instance
const apiClient = axios.create({
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to dynamically apply currently configured base URL
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

/**
 * System Status API
 * GET /api/status
 */
export async function getSystemStatus() {
  try {
    const response = await apiClient.get('/api/status');
    return { data: response.data, isMock: false };
  } catch (error) {
    console.warn('[API] /api/status unreachable, using fallback mock status:', error.message);
    return { data: INITIAL_SYSTEM_STATUS, isMock: true };
  }
}

/**
 * Start Monitoring Session
 * POST /api/monitor/start
 */
export async function startMonitoringSession(payload = { source: 'drone_cam_1' }) {
  try {
    const response = await apiClient.post('/api/monitor/start', payload);
    return { data: response.data, isMock: false };
  } catch (error) {
    console.warn('[API] /api/monitor/start unreachable, using mock acknowledgment:', error.message);
    return {
      data: {
        success: true,
        message: `Monitoring session started for source: ${payload.source || 'drone_cam_1'}`,
        sessionId: `SESSION-${Date.now()}`,
        status: 'active',
      },
      isMock: true,
    };
  }
}

/**
 * Stop Monitoring Session
 * POST /api/monitor/stop
 */
export async function stopMonitoringSession() {
  try {
    const response = await apiClient.post('/api/monitor/stop');
    return { data: response.data, isMock: false };
  } catch (error) {
    console.warn('[API] /api/monitor/stop unreachable, using mock acknowledgment:', error.message);
    return {
      data: {
        success: true,
        message: 'Monitoring session terminated',
        status: 'stopped',
      },
      isMock: true,
    };
  }
}

/**
 * Get Detection Records
 * GET /api/detections
 */
export async function getDetections(params = {}) {
  try {
    const response = await apiClient.get('/api/detections', { params });
    // Normalize format
    const detections = Array.isArray(response.data) ? response.data : (response.data.detections || []);
    return { data: detections, isMock: false };
  } catch (error) {
    console.warn('[API] /api/detections unreachable, using mock detection dataset:', error.message);
    return { data: INITIAL_DETECTIONS, isMock: true };
  }
}

/**
 * Get Alerts
 * GET /api/alerts
 */
export async function getAlerts(params = {}) {
  try {
    const response = await apiClient.get('/api/alerts', { params });
    const alerts = Array.isArray(response.data) ? response.data : (response.data.alerts || []);
    return { data: alerts, isMock: false };
  } catch (error) {
    console.warn('[API] /api/alerts unreachable, using mock alerts dataset:', error.message);
    return { data: INITIAL_ALERTS, isMock: true };
  }
}

/**
 * Upload Video (MP4 / AVI)
 * POST /api/videos/upload
 */
export async function uploadVideoFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post('/api/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (onProgress) onProgress(percent);
        }
      },
    });
    return { data: response.data, isMock: false };
  } catch (error) {
    console.warn('[API] /api/videos/upload unreachable, simulating successful upload:', error.message);
    
    // Simulate upload progress for mock demo
    if (onProgress) {
      for (let p = 10; p <= 100; p += 30) {
        onProgress(p);
      }
    }

    return {
      data: {
        success: true,
        filename: file.name,
        size_bytes: file.size,
        file_id: `VID-${Date.now().toString(36).toUpperCase()}`,
        status: 'queued_for_yolo_processing',
        message: 'File uploaded successfully and queued for YOLOv8 inference pipeline.',
      },
      isMock: true,
    };
  }
}

/**
 * Returns the URL for streaming video feed
 * GET /api/video-feed?source=...
 */
export function getVideoFeedUrl(source = 'drone_cam_1') {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  return `${base}/api/video-feed?source=${encodeURIComponent(source)}`;
}

export default apiClient;
