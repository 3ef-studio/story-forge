'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

interface StoryEvent {
  id: string;
  type: string;
  summary: string;
  fullDescription?: string | null;
  weight: number;
  tags: string[];
  createdAt: string;
}

interface StoryLogProps {
  events: StoryEvent[];
  maxDisplay?: number;
}

export function StoryLog({ events, maxDisplay = 10 }: StoryLogProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const displayedEvents = expanded ? events : events.slice(0, maxDisplay);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const typeColors: Record<string, 'default' | 'destructive' | 'success' | 'warning'> = {
    origin: 'default',
    encounter: 'warning',
    action: 'secondary' as 'default',
    level_up: 'success',
    power_unlock: 'success',
    faction_change: 'warning',
    combat: 'destructive',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Story Log
          </span>
          <span className="text-sm font-normal text-gray-500">
            {events.length} events
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Your story is just beginning...
          </p>
        ) : (
          <div className="space-y-2">
            {displayedEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={typeColors[event.type] || 'default'}
                        className="text-xs capitalize"
                      >
                        {event.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{event.summary}</p>

                    {/* Expandable full description */}
                    {event.fullDescription && (
                      <>
                        <button
                          onClick={() =>
                            setExpandedEvent(
                              expandedEvent === event.id ? null : event.id
                            )
                          }
                          className="mt-1 text-xs text-blue-500 hover:underline"
                        >
                          {expandedEvent === event.id ? 'Show less' : 'Show more'}
                        </button>
                        {expandedEvent === event.id && (
                          <p className="mt-2 text-sm text-gray-600 bg-white p-2 rounded border">
                            {event.fullDescription}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Show more/less toggle */}
            {events.length > maxDisplay && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="w-full"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show {events.length - maxDisplay} More
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
