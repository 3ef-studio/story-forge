'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface StoryEvent {
  id: string;
  type: string;
  summary: string;
  fullDescription: string | null;
  weight: number;
  tags: string[];
  createdAt: string;
}

interface StoryLogPanelProps {
  events: StoryEvent[];
  maxItems?: number;
  compact?: boolean;
}

function getEventIcon(type: string): string {
  switch (type) {
    case 'encounter_success':
    case 'encounter':
      return '✓';
    case 'encounter_failure':
      return '✗';
    case 'level_up':
      return '⬆';
    case 'action':
      return '→';
    case 'goal_complete':
      return '★';
    case 'city_update':
      return '📰';
    default:
      return '•';
  }
}

function getEventColor(type: string): string {
  switch (type) {
    case 'encounter_success':
    case 'encounter':
      return 'text-green-600 bg-green-50';
    case 'encounter_failure':
      return 'text-red-600 bg-red-50';
    case 'level_up':
      return 'text-yellow-600 bg-yellow-50';
    case 'goal_complete':
      return 'text-purple-600 bg-purple-50';
    case 'city_update':
      return 'text-amber-600 bg-amber-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function StoryLogItem({ event, compact }: { event: StoryEvent; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasDescription = event.fullDescription && event.fullDescription !== event.summary;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        expanded ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <button
        onClick={() => hasDescription && setExpanded(!expanded)}
        className={`w-full text-left p-3 ${hasDescription ? 'cursor-pointer' : 'cursor-default'}`}
        disabled={!hasDescription}
      >
        <div className="flex items-start gap-2">
          {/* Event icon */}
          <span
            className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${getEventColor(
              event.type
            )}`}
          >
            {getEventIcon(event.type)}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm text-gray-800 ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
              {event.summary}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(event.createdAt)}
              </span>
            </div>
          </div>

          {/* Expand indicator */}
          {hasDescription && (
            <span className="text-gray-400 flex-shrink-0">
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          )}
        </div>
      </button>

      {/* Expanded description */}
      {expanded && hasDescription && (
        <div className="px-3 pb-3 pt-0">
          <div className="pl-7 border-l-2 border-gray-200 ml-2.5">
            <p className="text-sm text-gray-600 leading-relaxed">{event.fullDescription}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function StoryLogPanel({ events, maxItems = 10, compact = false }: StoryLogPanelProps) {
  const displayEvents = events.slice(0, maxItems);

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">Your story is just beginning...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayEvents.map((event) => (
        <StoryLogItem key={event.id} event={event} compact={compact} />
      ))}
    </div>
  );
}

export default StoryLogPanel;
