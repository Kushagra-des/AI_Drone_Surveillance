import React from 'react';
import { Crosshair } from 'lucide-react';

export default function LoadingSpinner({ message = 'Acquiring Surveillance Stream...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
        <Crosshair className="w-6 h-6 text-cyan-400 absolute animate-pulse" />
      </div>
      <div className="text-xs uppercase font-mono tracking-widest text-cyan-400/80">
        {message}
      </div>
    </div>
  );
}
