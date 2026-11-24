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
    <div className="flex h-screen bg-[#f5f7fb] overflow-hidden text-slate-100">
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
        <main className="flex-1 overflow-y-auto p-5 md:p-8 relative">
          <Outlet />
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
