'use client';

/**
 * Dungeon Page
 *
 * Main UI for the dungeon subsystem:
 * - Shows current room info
 * - Available moves (adjacent discovered nodes)
 * - Search for secrets
 * - Minimap visualization
 * - Abandon option
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { AnimatedCard } from '@/app/components/ui/AnimatedCard';
import { LoadingSigil } from '@/app/components/ui/LoadingSigil';
import { useToast } from '@/app/components/ui/toast';
import {
  ArrowLeft,
  DoorOpen,
  Search,
  LogOut,
  Skull,
  Gem,
  Swords,
  AlertTriangle,
  MessageSquare,
  MapPin,
  CheckCircle,
  Eye,
  Lock,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface MinimapNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  state: string;
  contentType: string | null;
  isBoss: boolean;
  label?: string;
  isCurrent: boolean;
}

interface MinimapEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: string;
}

interface MinimapDTO {
  floorId: string;
  districtId: string;
  depth: number;
  width: number;
  height: number;
  currentNodeId: string;
  nodes: MinimapNode[];
  edges: MinimapEdge[];
  sessionState: string;
}

interface DungeonSession {
  id: string;
  districtId: string;
  floorId: string;
  depth: number;
  currentNodeId: string;
  state: string;
}

interface AvailableMove {
  nodeId: string;
  type: string;
  isSecret: boolean;
}

interface DungeonStatusResponse {
  success: boolean;
  hasActiveSession: boolean;
  session?: DungeonSession;
  minimap?: MinimapDTO;
  availableMoves?: AvailableMove[];
  hasAdjacentSecrets?: boolean;
  isComplete?: boolean;
  error?: string;
}

interface MoveResult {
  success: boolean;
  newNodeId?: string;
  traversedNodes?: string[];
  encounter?: {
    type: string;
    isBoss: boolean;
    nodeId: string;
  } | null;
  discoveredNodes?: string[];
  discoveredEdges?: string[];
  error?: string;
}

interface SearchResult {
  success: boolean;
  discovered?: {
    edgeId: string;
    fromNodeId: string;
    toNodeId: string;
  };
  statUsed?: string;
  rollResult?: number;
  target?: number;
  error?: string;
}

// ============================================================
// Node Type Info
// ============================================================

const NODE_TYPE_INFO: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  CHAMBER: { icon: <DoorOpen className="w-5 h-5" />, label: 'Chamber', color: 'text-blue-400' },
  CORRIDOR: { icon: <MapPin className="w-5 h-5" />, label: 'Corridor', color: 'text-gray-400' },
  JUNCTION: { icon: <MapPin className="w-5 h-5" />, label: 'Junction', color: 'text-purple-400' },
  BOSS: { icon: <Skull className="w-5 h-5" />, label: 'Boss Chamber', color: 'text-red-400' },
  STAIRS: { icon: <ArrowLeft className="w-5 h-5 rotate-90" />, label: 'Entrance', color: 'text-green-400' },
  SECRET: { icon: <Eye className="w-5 h-5" />, label: 'Secret Room', color: 'text-yellow-400' },
};

const CONTENT_TYPE_INFO: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  combat: { icon: <Swords className="w-4 h-4" />, label: 'Combat', color: 'text-red-400' },
  elite: { icon: <Skull className="w-4 h-4" />, label: 'Elite', color: 'text-orange-400' },
  trap: { icon: <AlertTriangle className="w-4 h-4" />, label: 'Trap', color: 'text-yellow-400' },
  event: { icon: <MessageSquare className="w-4 h-4" />, label: 'Event', color: 'text-blue-400' },
  treasure: { icon: <Gem className="w-4 h-4" />, label: 'Treasure', color: 'text-emerald-400' },
};

// ============================================================
// Minimap Component
// ============================================================

function DungeonMinimap({
  minimap,
  onNodeClick,
  availableMoves,
}: {
  minimap: MinimapDTO;
  onNodeClick?: (nodeId: string) => void;
  availableMoves: AvailableMove[];
}) {
  const padding = 20;
  const scale = 0.5;
  const viewWidth = minimap.width * scale + padding * 2;
  const viewHeight = minimap.height * scale + padding * 2;

  const availableMoveIds = new Set(availableMoves.map((m) => m.nodeId));

  // Build node lookup
  const nodeMap = new Map(minimap.nodes.map((n) => [n.id, n]));

  const getNodeColor = (node: MinimapNode) => {
    if (node.isCurrent) return '#3b82f6'; // blue-500
    if (node.state === 'CLEARED') return '#22c55e'; // green-500
    if (node.isBoss) return '#ef4444'; // red-500
    if (node.type === 'SECRET') return '#eab308'; // yellow-500
    if (node.type === 'STAIRS') return '#10b981'; // emerald-500
    return '#6b7280'; // gray-500
  };

  const getEdgeColor = (edge: MinimapEdge) => {
    if (edge.type === 'SECRET') return '#eab308'; // yellow-500
    if (edge.type === 'LOCKED') return '#f97316'; // orange-500
    return '#4b5563'; // gray-600
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-gray-900/50 border border-white/10">
      <svg
        width="100%"
        height="300"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Edges */}
        {minimap.edges.map((edge) => {
          const fromNode = nodeMap.get(edge.fromNodeId);
          const toNode = nodeMap.get(edge.toNodeId);
          if (!fromNode || !toNode) return null;

          const x1 = padding + (fromNode.x + fromNode.width / 2) * scale;
          const y1 = padding + (fromNode.y + fromNode.height / 2) * scale;
          const x2 = padding + (toNode.x + toNode.width / 2) * scale;
          const y2 = padding + (toNode.y + toNode.height / 2) * scale;

          return (
            <line
              key={edge.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={getEdgeColor(edge)}
              strokeWidth={edge.type === 'SECRET' ? 2 : 3}
              strokeDasharray={edge.type === 'SECRET' ? '4,4' : edge.type === 'LOCKED' ? '8,4' : undefined}
              opacity={0.6}
            />
          );
        })}

        {/* Nodes */}
        {minimap.nodes.map((node) => {
          const x = padding + node.x * scale;
          const y = padding + node.y * scale;
          const w = node.width * scale;
          const h = node.height * scale;
          const isClickable = availableMoveIds.has(node.id) && !node.isCurrent;

          return (
            <g
              key={node.id}
              onClick={() => isClickable && onNodeClick?.(node.id)}
              className={isClickable ? 'cursor-pointer' : ''}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={4}
                fill={getNodeColor(node)}
                stroke={node.isCurrent ? '#fff' : isClickable ? '#60a5fa' : 'transparent'}
                strokeWidth={node.isCurrent ? 3 : isClickable ? 2 : 0}
                opacity={node.state === 'CLEARED' ? 0.5 : 0.8}
              />
              {/* Boss indicator */}
              {node.isBoss && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 4}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={12}
                  fontWeight="bold"
                >
                  B
                </text>
              )}
              {/* Current indicator */}
              {node.isCurrent && (
                <circle
                  cx={x + w / 2}
                  cy={y + h / 2}
                  r={6}
                  fill="#fff"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-white/60">Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500 opacity-50" />
          <span className="text-white/60">Cleared</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-white/60">Boss</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-white/60">Secret</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function DungeonPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<DungeonStatusResponse | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lastSearchResult, setLastSearchResult] = useState<SearchResult | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/dungeon/status');
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch dungeon status');
      }
      const data: DungeonStatusResponse = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Dungeon status error:', err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load dungeon status',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [router, addToast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleMove = async (targetNodeId: string) => {
    if (isMoving) return;
    setIsMoving(true);
    setLastSearchResult(null);

    try {
      const response = await fetch('/api/dungeon/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetNodeId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        addToast({
          type: 'error',
          title: 'Move Failed',
          message: data.error || 'Could not move to that room',
          duration: 3000,
        });
        return;
      }

      const moveResult: MoveResult = data.move;

      // Check for encounter
      if (moveResult.encounter) {
        const enc = moveResult.encounter;
        const contentInfo = CONTENT_TYPE_INFO[enc.type] || { label: enc.type, color: 'text-white' };
        addToast({
          type: enc.isBoss ? 'warning' : 'info',
          title: enc.isBoss ? 'Boss Encounter!' : 'Encounter!',
          message: `You found: ${contentInfo.label}`,
          duration: 4000,
        });

        // Clear the node after encounter (MVP: auto-clear)
        await fetch('/api/dungeon/clear-node', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId: enc.nodeId }),
        });
      }

      // Refresh status
      await fetchStatus();
    } catch (err) {
      console.error('Move error:', err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An error occurred during movement',
        duration: 3000,
      });
    } finally {
      setIsMoving(false);
    }
  };

  const handleSearch = async () => {
    if (isSearching) return;
    setIsSearching(true);

    try {
      const response = await fetch('/api/dungeon/search', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        addToast({
          type: 'error',
          title: 'Search Failed',
          message: data.error || 'Could not search this room',
          duration: 3000,
        });
        return;
      }

      const searchResult: SearchResult = data.search;
      setLastSearchResult(searchResult);

      if (searchResult.discovered) {
        addToast({
          type: 'success',
          title: 'Secret Found!',
          message: `You discovered a hidden passage! (Roll: ${searchResult.rollResult} vs DC ${searchResult.target})`,
          duration: 4000,
        });
      } else if (searchResult.rollResult !== undefined) {
        addToast({
          type: 'info',
          title: 'Nothing Found',
          message: `Your search revealed nothing. (Roll: ${searchResult.rollResult} vs DC ${searchResult.target})`,
          duration: 3000,
        });
      } else {
        addToast({
          type: 'info',
          title: 'Search Complete',
          message: searchResult.error || 'You search carefully but find nothing.',
          duration: 3000,
        });
      }

      // Refresh status to update minimap
      await fetchStatus();
    } catch (err) {
      console.error('Search error:', err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An error occurred during search',
        duration: 3000,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAbandon = async () => {
    if (isAbandoning) return;
    if (!confirm('Are you sure you want to abandon this dungeon? You will lose all progress on this floor.')) {
      return;
    }

    setIsAbandoning(true);

    try {
      const response = await fetch('/api/dungeon/abandon', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        addToast({
          type: 'error',
          title: 'Abandon Failed',
          message: data.error || 'Could not abandon dungeon',
          duration: 3000,
        });
        return;
      }

      addToast({
        type: 'warning',
        title: 'Dungeon Abandoned',
        message: 'You retreated from the dungeon.',
        duration: 3000,
      });

      router.push('/game');
    } catch (err) {
      console.error('Abandon error:', err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An error occurred',
        duration: 3000,
      });
    } finally {
      setIsAbandoning(false);
    }
  };

  const handleComplete = async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    try {
      const response = await fetch('/api/dungeon/complete', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        addToast({
          type: 'error',
          title: 'Completion Failed',
          message: data.error || 'Could not complete dungeon',
          duration: 3000,
        });
        return;
      }

      addToast({
        type: 'success',
        title: 'Dungeon Complete!',
        message: `+${data.xpReward} XP, +${data.goldReward} Gold`,
        duration: 5000,
      });

      router.push('/game');
    } catch (err) {
      console.error('Complete error:', err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An error occurred',
        duration: 3000,
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingSigil label="Loading dungeon" />
      </div>
    );
  }

  // No active session
  if (!status?.hasActiveSession || !status.session || !status.minimap) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/game" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold">Dungeon</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <AnimatedCard variant="panel" className="panel-glass p-8 text-center">
            <DoorOpen className="w-16 h-16 mx-auto mb-4 text-white/40" />
            <h2 className="text-xl font-semibold text-white mb-2">No Active Dungeon</h2>
            <p className="text-white/60 mb-6">
              Enter a dungeon from a district to begin exploring.
            </p>
            <Link href="/game">
              <Button>Return to Game</Button>
            </Link>
          </AnimatedCard>
        </main>
      </div>
    );
  }

  const { session, minimap, availableMoves = [], hasAdjacentSecrets, isComplete } = status;

  // Find current node
  const currentNode = minimap.nodes.find((n) => n.isCurrent);
  const nodeInfo = currentNode ? NODE_TYPE_INFO[currentNode.type] : null;
  const contentInfo = currentNode?.contentType ? CONTENT_TYPE_INFO[currentNode.contentType] : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/game" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">Dungeon</h1>
              <p className="text-xs text-white/50">Floor {session.depth}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAbandon}
            disabled={isAbandoning}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Abandon
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Completion Banner */}
        {isComplete && (
          <AnimatedCard variant="panel" className="bg-green-500/20 border border-green-500/40 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="font-semibold text-green-400">Boss Defeated!</h3>
                  <p className="text-sm text-green-300/70">You can now complete this floor.</p>
                </div>
              </div>
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCompleting ? 'Completing...' : 'Complete Floor'}
              </Button>
            </div>
          </AnimatedCard>
        )}

        {/* Current Room */}
        <AnimatedCard variant="panel" className="panel-glass p-4 rounded-xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/10 ${nodeInfo?.color || 'text-white'}`}>
                {nodeInfo?.icon || <MapPin className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="font-semibold text-lg">{nodeInfo?.label || 'Unknown Room'}</h2>
                {currentNode?.label && (
                  <p className="text-sm text-white/50">{currentNode.label}</p>
                )}
              </div>
            </div>
            {contentInfo && currentNode?.state !== 'CLEARED' && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 ${contentInfo.color}`}>
                {contentInfo.icon}
                <span className="text-sm">{contentInfo.label}</span>
              </div>
            )}
            {currentNode?.state === 'CLEARED' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Cleared</span>
              </div>
            )}
          </div>

          {/* Search Result */}
          {lastSearchResult && (
            <div className={`p-3 rounded-lg mb-4 ${lastSearchResult.discovered ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5'}`}>
              <p className="text-sm">
                {lastSearchResult.discovered ? (
                  <span className="text-yellow-400">You found a hidden passage!</span>
                ) : (
                  <span className="text-white/60">
                    {lastSearchResult.rollResult !== undefined
                      ? `Search result: ${lastSearchResult.rollResult} (using ${lastSearchResult.statUsed}) vs DC ${lastSearchResult.target}`
                      : 'Nothing found.'}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSearch}
              disabled={isSearching || isMoving}
              className="flex-1 border-white/20 text-black hover:bg-white/10"
            >
              <Search className="w-4 h-4 mr-2" />
              {isSearching ? 'Searching...' : 'Search'}
              {hasAdjacentSecrets && !isSearching && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-500/30 text-yellow-400 rounded">!</span>
              )}
            </Button>
          </div>
        </AnimatedCard>

        {/* Minimap */}
        <AnimatedCard variant="panel" className="panel-glass p-4 rounded-xl">
          <h3 className="font-semibold text-white/80 mb-3">Map</h3>
          <DungeonMinimap
            minimap={minimap}
            availableMoves={availableMoves}
            onNodeClick={handleMove}
          />
        </AnimatedCard>

        {/* Available Moves */}
        <AnimatedCard variant="panel" className="panel-glass p-4 rounded-xl">
          <h3 className="font-semibold text-white/80 mb-3">Exits</h3>
          {availableMoves.length === 0 ? (
            <p className="text-sm text-white/40">No available exits from this room.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {availableMoves.map((move) => {
                const moveNode = minimap.nodes.find((n) => n.id === move.nodeId);
                const moveNodeInfo = NODE_TYPE_INFO[move.type] || { label: move.type, icon: <DoorOpen className="w-4 h-4" />, color: 'text-white' };
                const moveContentInfo = moveNode?.contentType ? CONTENT_TYPE_INFO[moveNode.contentType] : null;

                return (
                  <Button
                    key={move.nodeId}
                    variant="outline"
                    onClick={() => handleMove(move.nodeId)}
                    disabled={isMoving}
                    className={`justify-start border-white/20 text-black hover:bg-white/10 ${move.isSecret ? 'border-yellow-500/40' : ''}`}
                  >
                    <span className={moveNodeInfo.color}>{moveNodeInfo.icon}</span>
                    <span className="ml-2 flex-1 text-left">
                      {moveNodeInfo.label}
                      {move.isSecret && <Eye className="w-3 h-3 inline ml-1 text-yellow-400" />}
                    </span>
                    {moveContentInfo && moveNode?.state !== 'CLEARED' && (
                      <span className={`ml-2 ${moveContentInfo.color}`}>{moveContentInfo.icon}</span>
                    )}
                    {moveNode?.state === 'CLEARED' && (
                      <CheckCircle className="w-4 h-4 ml-2 text-green-400" />
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </AnimatedCard>
      </main>
    </div>
  );
}
