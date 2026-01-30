'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Eye, Sword, Shield } from 'lucide-react';

export type FocusMode = 'power' | 'awareness' | 'aggression' | 'defense';

export type FocusResult = {
  mode: FocusMode | null;
  modifier: number; // 0..3
};

const FOCUS_MODES: { id: FocusMode; label: string; icon: typeof Zap; color: string; activeColor: string; barColor: string }[] = [
  { id: 'power', label: 'Power', icon: Zap, color: 'text-purple-400', activeColor: 'bg-purple-500/30 border-purple-400/60 text-purple-300', barColor: 'bg-purple-500' },
  { id: 'awareness', label: 'Awareness', icon: Eye, color: 'text-blue-400', activeColor: 'bg-blue-500/30 border-blue-400/60 text-blue-300', barColor: 'bg-blue-500' },
  { id: 'aggression', label: 'Aggression', icon: Sword, color: 'text-red-400', activeColor: 'bg-red-500/30 border-red-400/60 text-red-300', barColor: 'bg-red-500' },
  { id: 'defense', label: 'Defense', icon: Shield, color: 'text-green-400', activeColor: 'bg-green-500/30 border-green-400/60 text-green-300', barColor: 'bg-green-500' },
];

// Timing windows: center position (0-1) and half-width
const TIMING_WINDOWS = [
  { center: 0.25, halfWidth: 0.04 },
  { center: 0.55, halfWidth: 0.04 },
  { center: 0.80, halfWidth: 0.04 },
] as const;

// Simulated progress bar duration in ms (caps at 95% until execute returns)
const SIMULATED_DURATION_MS = 4000;
// Minimum hold time inside a window to award a charge (ms)
const MIN_HOLD_MS = 200;

interface FocusChannelProps {
  onComplete: (result: FocusResult) => void;
  active: boolean; // true while execute is in flight
}

export function FocusChannel({ onComplete, active }: FocusChannelProps) {
  const [activeFocus, setActiveFocus] = useState<FocusMode | null>(null);
  const [charges, setCharges] = useState(0);
  const [awardedWindows, setAwardedWindows] = useState<boolean[]>([false, false, false]);
  const [progressPct, setProgressPct] = useState(0);

  // Refs for timing tracking
  const perFocusMsRef = useRef<Record<FocusMode, number>>({ power: 0, awareness: 0, aggression: 0, defense: 0 });
  const lastSwitchTimeRef = useRef<number>(Date.now());
  const startTimeRef = useRef<number>(Date.now());
  const hasCompletedRef = useRef(false);
  // Track how long the current focus has been held inside each window
  const windowHoldStartRef = useRef<(number | null)[]>([null, null, null]);

  // Tick progress at ~30fps
  useEffect(() => {
    if (!active) return;
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      // Cap at 95% until execute returns
      const pct = Math.min(0.95, elapsed / SIMULATED_DURATION_MS);
      setProgressPct(pct);
    }, 33);
    return () => clearInterval(interval);
  }, [active]);

  // Check timing windows on each progress tick
  useEffect(() => {
    if (!active || !activeFocus) return;

    const now = Date.now();

    TIMING_WINDOWS.forEach((win, idx) => {
      if (awardedWindows[idx]) return; // Already awarded

      const inWindow = progressPct >= win.center - win.halfWidth && progressPct <= win.center + win.halfWidth;

      if (inWindow) {
        // Start hold timer if not already
        if (windowHoldStartRef.current[idx] === null) {
          windowHoldStartRef.current[idx] = now;
        }
        // Check if held long enough
        const holdStart = windowHoldStartRef.current[idx];
        if (holdStart !== null && now - holdStart >= MIN_HOLD_MS) {
          // Award charge
          setAwardedWindows(prev => {
            const next = [...prev];
            next[idx] = true;
            return next;
          });
          setCharges(prev => Math.min(3, prev + 1));
        }
      } else {
        // Reset hold timer when outside window
        windowHoldStartRef.current[idx] = null;
      }
    });
  }, [progressPct, active, activeFocus, awardedWindows]);

  // Reset hold timers when focus changes or is deselected
  useEffect(() => {
    windowHoldStartRef.current = [null, null, null];
  }, [activeFocus]);

  const attributeTime = useCallback(() => {
    if (activeFocus) {
      const now = Date.now();
      perFocusMsRef.current[activeFocus] += now - lastSwitchTimeRef.current;
      lastSwitchTimeRef.current = now;
    }
  }, [activeFocus]);

  const handleFocusChange = useCallback((mode: FocusMode) => {
    attributeTime();
    setActiveFocus(mode);
    lastSwitchTimeRef.current = Date.now();
  }, [attributeTime]);

  // When active becomes false (execute returned), compute result
  useEffect(() => {
    if (active || hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    // Attribute final time segment
    attributeTime();

    const perFocusMs = perFocusMsRef.current;

    // Find dominant focus
    let dominant: FocusMode | null = null;
    let maxMs = 0;
    for (const mode of Object.keys(perFocusMs) as FocusMode[]) {
      if (perFocusMs[mode] > maxMs) {
        maxMs = perFocusMs[mode];
        dominant = mode;
      }
    }

    // Count final charges (use the state snapshot via ref-accessible awarded)
    // charges state may be stale, so count directly from awardedWindows
    const finalCharges = awardedWindows.filter(Boolean).length;

    if (!dominant || finalCharges === 0) {
      onComplete({ mode: null, modifier: 0 });
      return;
    }

    onComplete({ mode: dominant, modifier: finalCharges });
  }, [active, attributeTime, onComplete, awardedWindows]);

  if (!active) return null;

  const activeConfig = activeFocus
    ? FOCUS_MODES.find(m => m.id === activeFocus)
    : null;

  const fillBarColor = activeConfig?.barColor ?? 'bg-white/20';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wide">
          Focus Channeling
        </h4>
        <div className="flex items-center gap-2">
          {/* Charge indicators */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full border transition-all duration-300 ${
                  i < charges
                    ? 'bg-yellow-400 border-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                    : 'bg-white/10 border-white/20'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-white/40">
            {charges}/3
          </span>
        </div>
      </div>

      {/* Progress bar with timing windows */}
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        {/* Timing window highlights */}
        {TIMING_WINDOWS.map((win, idx) => {
          const left = (win.center - win.halfWidth) * 100;
          const width = win.halfWidth * 2 * 100;
          const isActive = progressPct >= win.center - win.halfWidth && progressPct <= win.center + win.halfWidth;
          const isAwarded = awardedWindows[idx];
          return (
            <div
              key={idx}
              className={`absolute top-0 bottom-0 rounded-sm transition-all duration-150 ${
                isAwarded
                  ? 'bg-yellow-400/40'
                  : isActive && activeFocus
                  ? 'bg-white/40 animate-pulse'
                  : 'bg-white/15'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        {/* Progress fill */}
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-[width] duration-100 ${fillBarColor} opacity-80`}
          style={{ width: `${progressPct * 100}%` }}
        />
        {/* Playhead marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white/80 transition-[left] duration-100"
          style={{ left: `${progressPct * 100}%` }}
        />
      </div>

      {/* Focus buttons */}
      <div className="grid grid-cols-4 gap-2">
        {FOCUS_MODES.map(({ id, label, icon: Icon, color, activeColor }) => {
          const isActive = activeFocus === id;
          // Check if playhead is inside any window right now
          const inAnyWindow = TIMING_WINDOWS.some(
            win => progressPct >= win.center - win.halfWidth && progressPct <= win.center + win.halfWidth
          );
          return (
            <button
              key={id}
              onClick={() => handleFocusChange(id)}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border transition-all text-xs font-medium ${
                isActive
                  ? activeColor
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20'
              } ${inAnyWindow && !isActive ? 'ring-1 ring-white/20' : ''}`}
            >
              <Icon className={`h-4 w-4 ${isActive ? '' : color}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {!activeFocus && (
        <p className="text-xs text-white/30 text-center">
          Select a focus and hold it through the timing windows to charge.
        </p>
      )}
    </div>
  );
}
