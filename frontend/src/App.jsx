import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SurveillanceProvider } from './context/SurveillanceContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';

import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import DetectionHistory from './pages/DetectionHistory';
import Alerts from './pages/Alerts';
import VideoUpload from './pages/VideoUpload';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ToastProvider>
      <SurveillanceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="monitoring" element={<LiveMonitoring />} />
              <Route path="history" element={<DetectionHistory />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="upload" element={<VideoUpload />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SurveillanceProvider>
    </ToastProvider>
  );
}
