import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import ConnectionBanner from '../common/ConnectionBanner';
import ToastContainer from '../common/ToastContainer';

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#080c14] overflow-hidden text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNav setIsMobileOpen={setIsMobileOpen} />

        {/* Global Connection / Mock fallback banner */}
        <ConnectionBanner />

        {/* Page Views with HUD grid pattern */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 hud-grid relative">
          <Outlet />
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
