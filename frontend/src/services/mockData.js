/**
 * Mock data service for AI Drone Surveillance System.
 * Adheres strictly to the detection schema:
 * { class: string, confidence: number, bbox: [number, number, number, number] }
 */

export const INITIAL_SYSTEM_STATUS = {
  status: 'online',
  monitoring: true,
  drone_connected: true,
  battery_level: 84,
  altitude_m: 45.2,
  speed_mps: 12.4,
  fps: 28.5,
  signal_quality: 94,
  active_source: 'drone_cam_1',
  ai_model: {
    name: 'YOLOv8x-Surveillance',
    framework: 'PyTorch / OpenCV',
    device: 'CUDA GPU',
    inference_time_ms: 14.2,
    threshold: 0.50,
  },
  summary: {
    total_detections: 1428,
    people_detected: 894,
    vehicles_detected: 534,
    active_alerts: 3,
  },
};

export const INITIAL_ALERTS = [
  {
    id: 'ALT-1089',
    title: 'Restricted Perimeter Breach',
    severity: 'critical',
    category: 'Perimeter Security',
    description: 'Person detected in Sector 4 (South Hangar) outside scheduled operating window.',
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    source: 'drone_cam_1',
    status: 'active',
    confidence: 0.94,
    class: 'person',
  },
  {
    id: 'ALT-1088',
    title: 'Suspicious Vehicle Loitering',
    severity: 'high',
    category: 'Vehicle Monitoring',
    description: 'Unidentified black SUV stationary in restricted security zone for > 7 minutes.',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    source: 'drone_cam_2',
    status: 'active',
    confidence: 0.89,
    class: 'car',
  },
  {
    id: 'ALT-1087',
    title: 'Crowd Density Exceeded',
    severity: 'medium',
    category: 'Crowd Control',
    description: 'Cluster of 6+ individuals detected near North Gate checkpoint.',
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    source: 'drone_cam_1',
    status: 'acknowledged',
    confidence: 0.86,
    class: 'person',
  },
  {
    id: 'ALT-1086',
    title: 'Off-Road Heavy Vehicle',
    severity: 'medium',
    category: 'Traffic Anomaly',
    description: 'Heavy construction truck moving on non-designated perimeter pathway.',
    timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    source: 'drone_cam_2',
    status: 'acknowledged',
    confidence: 0.91,
    class: 'truck',
  },
  {
    id: 'ALT-1085',
    title: 'High Altitude Wind Shear Alert',
    severity: 'low',
    category: 'Flight Safety',
    description: 'Drone stabilization compensated for sudden 24 knot crosswind gust.',
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    source: 'drone_cam_1',
    status: 'resolved',
    confidence: 1.0,
    class: 'drone_telemetry',
  },
];

export const INITIAL_DETECTIONS = [
  {
    id: 'DET-9821',
    class: 'person',
    confidence: 0.94,
    bbox: [142, 98, 64, 150],
    source: 'drone_cam_1',
    timestamp: new Date(Date.now() - 20 * 1000).toISOString(),
    zone: 'Sector 3A - Runway North',
  },
  {
    id: 'DET-9820',
    class: 'car',
    confidence: 0.89,
    bbox: [320, 210, 180, 95],
    source: 'drone_cam_1',
    timestamp: new Date(Date.now() - 45 * 1000).toISOString(),
    zone: 'Sector 1B - Main Access Road',
  },
  {
    id: 'DET-9819',
    class: 'person',
    confidence: 0.91,
    bbox: [215, 110, 58, 142],
    source: 'drone_cam_1',
    timestamp: new Date(Date.now() - 90 * 1000).toISOString(),
    zone: 'Sector 3A - Runway North',
  },
  {
    id: 'DET-9818',
    class: 'truck',
    confidence: 0.87,
    bbox: [410, 180, 240, 130],
    source: 'drone_cam_2',
    timestamp: new Date(Date.now() - 140 * 1000).toISOString(),
    zone: 'Sector 4 - South Depot',
  },
  {
    id: 'DET-9817',
    class: 'motorcycle',
    confidence: 0.82,
    bbox: [190, 260, 90, 70],
    source: 'drone_cam_2',
    timestamp: new Date(Date.now() - 210 * 1000).toISOString(),
    zone: 'Sector 2 - East Perimeter',
  },
  {
    id: 'DET-9816',
    class: 'person',
    confidence: 0.78,
    bbox: [520, 140, 52, 138],
    source: 'drone_cam_1',
    timestamp: new Date(Date.now() - 320 * 1000).toISOString(),
    zone: 'Sector 2 - East Perimeter',
  },
  {
    id: 'DET-9815',
    class: 'car',
    confidence: 0.95,
    bbox: [280, 310, 175, 90],
    source: 'uploaded_video',
    timestamp: new Date(Date.now() - 460 * 1000).toISOString(),
    zone: 'Recorded Segment #04',
  },
  {
    id: 'DET-9814',
    class: 'person',
    confidence: 0.88,
    bbox: [110, 170, 60, 145],
    source: 'uploaded_video',
    timestamp: new Date(Date.now() - 580 * 1000).toISOString(),
    zone: 'Recorded Segment #04',
  },
];

export const HOURLY_DETECTION_TRENDS = [
  { time: '18:00', people: 42, vehicles: 28, alerts: 1 },
  { time: '19:00', people: 65, vehicles: 45, alerts: 2 },
  { time: '20:00', people: 78, vehicles: 52, alerts: 0 },
  { time: '21:00', people: 54, vehicles: 39, alerts: 3 },
  { time: '22:00', people: 32, vehicles: 24, alerts: 1 },
  { time: '23:00', people: 19, vehicles: 15, alerts: 2 },
  { time: '00:00', people: 12, vehicles: 8, alerts: 1 },
];

export const CLASS_DISTRIBUTION = [
  { name: 'Person', value: 894, color: '#06b6d4' },
  { name: 'Car', value: 342, color: '#3b82f6' },
  { name: 'Truck', value: 112, color: '#8b5cf6' },
  { name: 'Motorcycle', value: 80, color: '#ec4899' },
  { name: 'Bicycle', value: 40, color: '#10b981' },
];

/**
 * Generates an annotated detection object matching:
 * { class: string, confidence: number, bbox: [number, number, number, number] }
 */
export function generateRandomDetection(source = 'drone_cam_1') {
  const classes = ['person', 'car', 'truck', 'motorcycle'];
  const weights = [0.55, 0.3, 0.1, 0.05];
  
  let random = Math.random();
  let selectedClass = 'person';
  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i]) {
      selectedClass = classes[i];
      break;
    }
    random -= weights[i];
  }

  // Realistic normalized or pixel coordinates
  const x = Math.floor(80 + Math.random() * 450);
  const y = Math.floor(60 + Math.random() * 260);
  const width = selectedClass === 'person' ? Math.floor(45 + Math.random() * 25) : Math.floor(120 + Math.random() * 80);
  const height = selectedClass === 'person' ? Math.floor(110 + Math.random() * 40) : Math.floor(70 + Math.random() * 50);

  const confidence = parseFloat((0.72 + Math.random() * 0.26).toFixed(2));

  return {
    id: `DET-${Math.floor(1000 + Math.random() * 9000)}`,
    class: selectedClass,
    confidence,
    bbox: [x, y, width, height],
    source,
    timestamp: new Date().toISOString(),
    zone: `Sector ${Math.floor(1 + Math.random() * 4)}${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
  };
}
