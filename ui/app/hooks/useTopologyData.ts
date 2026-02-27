import { useMemo } from 'react';
import { useDql } from '@dynatrace-sdk/react-hooks';
import { useDemoMode } from './useDemoMode';
import { NETWORK_QUERIES } from '../data/networkCategories';
import { DEMO_TOPOLOGY_NODES, DEMO_TOPOLOGY_EDGES } from '../data/demoData';
import type { TopologyNode, TopologyEdge, DeviceRole } from '../types/network';
import { toNum } from '../utils';

/* ── Map Dynatrace device_type → canonical DeviceRole ── */
function mapDeviceRole(raw: unknown): DeviceRole {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('router')) return 'router';
  if (s.includes('switch') || s.includes('catalyst')) return 'switch';
  if (s.includes('firewall') || s.includes('palo') || s.includes('fortinet')) return 'firewall';
  if (s.includes('cloud') || s.includes('gateway') || s.includes('tgw')) return 'cloud-gw';
  if (s.includes('server') || s.includes('host')) return 'server';
  return 'router'; // default fallback
}

/* ── Map Dynatrace entity state → health colour ──────── */
function mapHealth(raw: unknown, problems: number): TopologyNode['health'] {
  const s = String(raw ?? '').toLowerCase();
  // If there are open problems, derive health from count
  if (problems >= 3) return 'critical';
  if (problems >= 1) return 'warning';
  // Then check entity state string
  if (s === 'ok' || s === 'healthy' || s === '') return 'healthy';
  if (s === 'warning' || s === 'degraded' || s === 'low') return 'warning';
  if (s === 'critical' || s === 'error' || s === 'high' || s === 'down') return 'critical';
  return 'unknown';
}

/* ── Force-directed layout ─────────────────────────── */
/**
 * Places nodes using a simple force-directed algorithm.
 * Runs entirely in-memory — no external deps.
 *
 * 1. Start with a circular layout
 * 2. Apply N iterations of repulsion (all pairs) + attraction (edges)
 * 3. Clamp to bounding box
 */
function layoutNodes(
  nodes: Omit<TopologyNode, 'x' | 'y'>[],
  edges: { source: string; target: string }[],
  width: number,
  height: number,
): TopologyNode[] {
  if (nodes.length === 0) return [];

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;

  // Initial circular placement
  const positioned = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    return {
      ...n,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  const idxMap = new Map(positioned.map((n, i) => [n.id, i]));

  const ITERATIONS = 60;
  const REPULSION = 8000;
  const ATTRACTION = 0.005;
  const DAMPING = 0.85;
  const MIN_DIST = 40;
  const PAD = 60;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between every pair
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        let dx = positioned[i].x - positioned[j].x;
        let dy = positioned[i].y - positioned[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
        const force = REPULSION / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        positioned[i].vx += dx;
        positioned[i].vy += dy;
        positioned[j].vx -= dx;
        positioned[j].vy -= dy;
      }
    }

    // Attraction along edges
    for (const e of edges) {
      const si = idxMap.get(e.source);
      const ti = idxMap.get(e.target);
      if (si === undefined || ti === undefined) continue;
      const dx = positioned[ti].x - positioned[si].x;
      const dy = positioned[ti].y - positioned[si].y;
      positioned[si].vx += dx * ATTRACTION;
      positioned[si].vy += dy * ATTRACTION;
      positioned[ti].vx -= dx * ATTRACTION;
      positioned[ti].vy -= dy * ATTRACTION;
    }

    // Apply velocities with damping, clamp to bounds
    for (const n of positioned) {
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x = Math.max(PAD, Math.min(width - PAD, n.x + n.vx));
      n.y = Math.max(PAD, Math.min(height - PAD, n.y + n.vy));
    }
  }

  // Strip velocity fields
  return positioned.map(({ vx, vy, ...rest }) => rest);
}

/* ── Hook return type ─────────────────────────────── */
export interface UseTopologyDataResult {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Provides topology nodes + edges from either demo data or live DQL.
 *
 * Live mode runs two DQL queries:
 *   1. `topologyNodes` — fetches all network devices with CPU/mem/problem count
 *   2. `topologyEdges` — fetches interface-to-device relationships with utilization
 *
 * Nodes are auto-positioned using a force-directed layout when live;
 * demo data uses hand-placed coordinates.
 */
export function useTopologyData(
  width = 960,
  height = 540,
): UseTopologyDataResult {
  const { demoMode } = useDemoMode();

  const nodesResult = useDql(
    { query: NETWORK_QUERIES.topologyNodes },
    { enabled: !demoMode, refetchInterval: 60_000 },
  );

  const edgesResult = useDql(
    { query: NETWORK_QUERIES.topologyEdges },
    { enabled: !demoMode, refetchInterval: 60_000 },
  );

  const liveData = useMemo(() => {
    if (demoMode) return null;
    const nodeRecords = nodesResult.data?.records;
    const edgeRecords = edgesResult.data?.records;
    if (!nodeRecords || !edgeRecords) return null;

    // Build nodes (without x/y — layout does that)
    const rawNodes: Omit<TopologyNode, 'x' | 'y'>[] = nodeRecords.map((r: any) => ({
      id: String(r.id ?? ''),
      label: String(r.deviceName ?? r['entity.name'] ?? 'Unknown'),
      role: mapDeviceRole(r.deviceType ?? r.device_type),
      health: mapHealth(r.state, toNum(r.problems)),
      ip: String(r.ip ?? ''),
      type: String(r.deviceType ?? ''),
      cpu: toNum(r.cpuPct),
      memory: toNum(r.memPct),
    }));

    // Build edges
    const rawEdges: TopologyEdge[] = edgeRecords.map((r: any) => ({
      source: String(r.sourceDevice ?? ''),
      target: String(r.targetDevice ?? ''),
      utilization: toNum(r.utilization),
      bandwidth: toNum(r.bandwidth),
    }));

    // Filter edges whose endpoints exist in the node set
    const nodeIds = new Set(rawNodes.map((n) => n.id));
    const validEdges = rawEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );

    // Auto-layout
    const nodes = layoutNodes(rawNodes, validEdges, width, height);
    return { nodes, edges: validEdges };
  }, [demoMode, nodesResult.data, edgesResult.data, width, height]);

  if (demoMode) {
    return {
      nodes: DEMO_TOPOLOGY_NODES,
      edges: DEMO_TOPOLOGY_EDGES,
      isLoading: false,
      error: null,
    };
  }

  return {
    nodes: liveData?.nodes ?? [],
    edges: liveData?.edges ?? [],
    isLoading: nodesResult.isLoading || edgesResult.isLoading,
    error: nodesResult.error?.message ?? edgesResult.error?.message ?? null,
  };
}
