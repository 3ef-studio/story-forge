'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, MapPin, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GameError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error for debugging
    console.error('[GameError] Runtime error caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800/50 border border-red-500/30 rounded-xl p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />

        <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>

        <p className="text-white/60 text-sm mb-6">
          An error occurred while running the game. Your progress has been saved.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-500/20 rounded-lg text-left">
            <p className="text-xs text-red-400 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Game
          </button>

          <div className="flex gap-3">
            <Link
              href="/map"
              className="flex items-center justify-center gap-2 flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors"
            >
              <MapPin className="w-4 h-4" />
              City Map
            </Link>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
