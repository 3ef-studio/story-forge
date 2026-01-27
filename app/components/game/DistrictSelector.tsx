'use client';

import { useState } from 'react';
import { districts, type DistrictId } from '@/app/data/districts';
import { MapPin, ChevronDown } from 'lucide-react';

interface DistrictSelectorProps {
  currentDistrict: DistrictId;
  onDistrictChange: (districtId: DistrictId) => void;
  disabled?: boolean;
}

export function DistrictSelector({
  currentDistrict,
  onDistrictChange,
  disabled = false,
}: DistrictSelectorProps) {
  const [open, setOpen] = useState(false);

  const current = districts.find((d) => d.id === currentDistrict);

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors w-full sm:w-auto ${
          disabled
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : open
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="flex-shrink-0">{current?.icon}</span>
        <span className="font-medium truncate">{current?.name ?? 'Downtown'}</span>
        <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
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
                      ? 'bg-blue-50 border-l-2 border-blue-500'
                      : 'hover:bg-gray-50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{district.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                        {district.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{district.description}</div>
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
