import { getWsBaseUrl } from './api';
import { generateRandomDetection } from './mockData';

/**
 * WebSocket manager for real-time detections: WS /ws/detections
 */
export class DetectionsWebSocketManager {
  constructor(options = {}) {
    this.url = options.url || `${getWsBaseUrl()}/ws/detections`;
    this.onDetection = options.onDetection || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.enableMockFallback = options.enableMockFallback !== undefined ? options.enableMockFallback : true;
    this.source = options.source || 'drone_cam_1';

    this.ws = null;
    this.reconnectTimer = null;
    this.mockTimer = null;
    this.isManualClosed = false;
    this.connectionStatus = 'disconnected'; // 'connecting' | 'connected' | 'error' | 'mock_active'
  }

  setSource(source) {
    this.source = source;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ action: 'set_source', source }));
      } catch (e) {
        console.error('Failed to notify WS of source change', e);
      }
    }
  }

  connect() {
    this.isManualClosed = false;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.stopMockStream();
        // Send initial handshake / source selection
        this.ws.send(JSON.stringify({ action: 'subscribe', source: this.source }));
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Standard detection shape: { class, confidence, bbox }
          this.onDetection(payload, false);
        } catch (err) {
          console.error('[WebSocket] Parsing error on message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Connection failed:', err);
        this.handleFailure();
      };

      this.ws.onclose = () => {
        if (!this.isManualClosed) {
          this.handleFailure();
        } else {
          this.setStatus('disconnected');
        }
      };
    } catch (e) {
      this.handleFailure();
    }
  }

  handleFailure() {
    this.setStatus('error');
    if (this.enableMockFallback) {
      this.startMockStream();
    } else {
      this.scheduleReconnect();
    }
  }

  startMockStream() {
    if (this.mockTimer) return;
    this.setStatus('mock_active');
    
    // Simulate real-time stream of YOLO detections every 1.5 to 3.5 seconds
    const emit = () => {
      if (this.isManualClosed) return;
      const mockDetection = generateRandomDetection(this.source);
      this.onDetection(mockDetection, true);

      const nextDelay = 1200 + Math.random() * 2000;
      this.mockTimer = setTimeout(emit, nextDelay);
    };

    this.mockTimer = setTimeout(emit, 1000);
  }

  stopMockStream() {
    if (this.mockTimer) {
      clearTimeout(this.mockTimer);
      this.mockTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer || this.isManualClosed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isManualClosed) {
        this.connect();
      }
    }, 5000);
  }

  setStatus(status) {
    this.connectionStatus = status;
    this.onStatusChange(status);
  }

  disconnect() {
    this.isManualClosed = true;
    this.stopMockStream();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }
}
