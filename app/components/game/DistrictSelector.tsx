'use client';

import { useState } from 'react';
import { districts, type DistrictId } from '@/app/data/districts';
import { MapPin, ChevronDown, DoorOpen } from 'lucide-react';

interface DistrictSelectorProps {
  currentDistrict: DistrictId;
  onDistrictChange: (districtId: DistrictId) => void;
  disabled?: boolean;
  onEnterDungeon?: () => void;
  dungeonLoading?: boolean;
}

export function DistrictSelector({
  currentDistrict,
  onDistrictChange,
  disabled = false,
  onEnterDungeon,
  dungeonLoading = false,
}: DistrictSelectorProps) {
  const [open, setOpen] = useState(false);

  const current = districts.find((d) => d.id === currentDistrict);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors flex-1 sm:flex-initial ${
            disabled
              ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
              : open
              ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
              : 'bg-white/10 border-white/15 text-white/80 hover:border-white/25 hover:bg-white/15'
          }`}
        >
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-shrink-0">{current?.icon}</span>
          <span className="font-medium truncate">{current?.name ?? 'Downtown'}</span>
          <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Enter Dungeon Button */}
        {onEnterDungeon && (
          <button
            onClick={onEnterDungeon}
            disabled={disabled || dungeonLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              disabled || dungeonLoading
                ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                : 'bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/50'
            }`}
            title="Enter the dungeon in this district"
          >
            <DoorOpen className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden sm:inline font-medium">
              {dungeonLoading ? 'Entering...' : 'Dungeon'}
            </span>
          </button>
        )}
      </div>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-72 bg-gray-900/95 border border-white/15 rounded-xl shadow-lg z-50 overflow-hidden backdrop-blur-md">
            {districts.map((district) => {
              const isActive = district.id === currentDistrict;
              return (
                <button
                  key={district.id}
                  onClick={() => {
                    onDistrictChange(district.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    isActive
                      ? 'bg-blue-500/20 border-l-2 border-blue-400'
                      : 'hover:bg-white/10 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{district.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${isActive ? 'text-blue-300' : 'text-white/80'}`}>
                        {district.name}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">{district.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
