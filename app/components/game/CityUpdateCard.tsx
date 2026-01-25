'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
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
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
          <Newspaper className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <p className="text-xs text-gray-700 leading-relaxed">
          {expanded || !needsTruncation ? body : truncatedBody}
        </p>

        <div className="flex items-center justify-between mt-2">
          {needsTruncation && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900"
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
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 ml-auto"
              onClick={onViewLog}
            >
              View Log
            </Button>
          )}
        </div>

        {timestamp && (
          <p className="text-xs text-gray-400 mt-1">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
