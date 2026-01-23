'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ScrollText, ChevronDown, ChevronUp, Filter, Star, Swords, Zap, Users, Trophy } from 'lucide-react';

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

type FilterType = 'all' | 'encounters' | 'milestones' | 'factions';

const typeIcons: Record<string, React.ReactNode> = {
  origin: <Star className="h-3 w-3" />,
  encounter: <Swords className="h-3 w-3" />,
  action: <Zap className="h-3 w-3" />,
  level_up: <Trophy className="h-3 w-3" />,
  power_unlock: <Zap className="h-3 w-3" />,
  faction_change: <Users className="h-3 w-3" />,
  combat: <Swords className="h-3 w-3" />,
};

export function StoryLog({ events, maxDisplay = 10 }: StoryLogProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'encounters') return events.filter(e => e.type === 'encounter' || e.type === 'combat');
    if (filter === 'milestones') return events.filter(e => e.type === 'level_up' || e.type === 'power_unlock' || e.weight >= 7);
    if (filter === 'factions') return events.filter(e => e.type === 'faction_change' || e.tags.some(t => t.includes('faction')));
    return events;
  }, [events, filter]);

  const displayedEvents = expanded ? filteredEvents : filteredEvents.slice(0, maxDisplay);

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
            {filteredEvents.length} events
          </span>
        </CardTitle>
        {/* Filter tabs */}
        <div className="flex gap-1 mt-3 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'encounters', label: 'Encounters' },
            { key: 'milestones', label: 'Milestones' },
            { key: 'factions', label: 'Factions' },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(key as FilterType)}
              className="text-xs h-7 px-2"
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <ScrollText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Your story is just beginning...</p>
            <p className="text-sm text-gray-400 mt-1">Take actions to fill these pages</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No events match this filter
          </p>
        ) : (
          <div className="space-y-2">
            {displayedEvents.map((event, index) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg border transition-all duration-300 hover:shadow-sm ${
                  event.weight >= 7
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge
                        variant={typeColors[event.type] || 'default'}
                        className="text-xs capitalize flex items-center gap-1"
                      >
                        {typeIcons[event.type]}
                        {event.type.replace('_', ' ')}
                      </Badge>
                      {event.weight >= 7 && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{event.summary}</p>

                    {/* Expandable full description */}
                    {event.fullDescription && (
                      <>
                        <button
                          onClick={() =>
                            setExpandedEvent(
                              expandedEvent === event.id ? null : event.id
                            )
                          }
                          className="mt-2 text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
                        >
                          {expandedEvent === event.id ? '− Show less' : '+ Read more'}
                        </button>
                        {expandedEvent === event.id && (
                          <div className="mt-2 text-sm text-gray-600 bg-white/80 p-3 rounded-lg border animate-fade-in">
                            {event.fullDescription}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Show more/less toggle */}
            {filteredEvents.length > maxDisplay && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="w-full mt-2 text-gray-500 hover:text-gray-700"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show {filteredEvents.length - maxDisplay} More
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
