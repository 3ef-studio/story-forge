'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { ChevronDown, ChevronUp, Newspaper } from 'lucide-react';

interface CityUpdateCardProps {
  title: string;
  body: string;
  timestamp?: string;
  onViewLog?: () => void;
}

export function CityUpdateCard({ title, body, timestamp, onViewLog }: CityUpdateCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Truncate body for collapsed view (first 80 chars)
  const truncatedBody = body.length > 80 ? body.slice(0, 80) + '...' : body;
  const needsTruncation = body.length > 80;

  return (
    <div className="panel-solid p-3">
      <div className="pb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-400">
          <Newspaper className="h-4 w-4" />
          {title}
        </h3>
      </div>
      <div>
        <p className="text-xs text-white/80 leading-relaxed">
          {expanded || !needsTruncation ? body : truncatedBody}
        </p>

        <div className="flex items-center justify-between mt-2">
          {needsTruncation && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-white/10"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  More
                </>
              )}
            </Button>
          )}

          {onViewLog && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-white/50 hover:text-white/80 hover:bg-white/10 ml-auto"
              onClick={onViewLog}
            >
              View Log
            </Button>
          )}
        </div>

        {timestamp && (
          <p className="text-xs text-white/40 mt-1">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}
