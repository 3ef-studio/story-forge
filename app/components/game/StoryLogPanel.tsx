'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

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
      return 'text-green-400 bg-green-500/20';
    case 'encounter_failure':
      return 'text-red-400 bg-red-500/20';
    case 'level_up':
      return 'text-yellow-400 bg-yellow-500/20';
    case 'goal_complete':
      return 'text-purple-400 bg-purple-500/20';
    case 'city_update':
      return 'text-amber-400 bg-amber-500/20';
    default:
      return 'text-white/60 bg-white/10';
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

function StoryLogItem({ event, compact, index }: { event: StoryEvent; compact?: boolean; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasDescription = event.fullDescription && event.fullDescription !== event.summary;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`rounded-lg border transition-colors ${
        expanded ? 'bg-white/10 border-white/15' : 'bg-white/5 border-white/10'
      }`}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0.1 : 0.25,
        delay: Math.min(index * 0.04, 0.4),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
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
            <p className={`text-sm text-white/80 ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
              {event.summary}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-white/40 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(event.createdAt)}
              </span>
            </div>
          </div>

          {/* Expand indicator */}
          {hasDescription && (
            <span className="text-white/40 flex-shrink-0">
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
      <AnimatePresence>
        {expanded && hasDescription && (
          <motion.div
            className="px-3 pb-3 pt-0 overflow-hidden"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.2, ease: 'easeInOut' }}
          >
            <div className="pl-7 border-l-2 border-white/20 ml-2.5">
              <p className="text-sm text-white/70 leading-relaxed">{event.fullDescription}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function StoryLogPanel({ events, maxItems = 10, compact = false }: StoryLogPanelProps) {
  const displayEvents = events.slice(0, maxItems);

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-8 text-white/50">
        <p className="text-sm">Your story is just beginning...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayEvents.map((event, index) => (
        <StoryLogItem key={event.id} event={event} compact={compact} index={index} />
      ))}
    </div>
  );
}

export default StoryLogPanel;
