import { useMemo } from 'react';
import { useDql } from '@dynatrace-sdk/react-hooks';
import { useDemoMode } from './useDemoMode';
import { NETWORK_QUERIES } from '../data/networkCategories';
import { DEMO_TOPOLOGY_NODES, DEMO_TOPOLOGY_EDGES } from '../data/demoData';
import type { TopologyNode, TopologyEdge, DeviceRole, TopologyEdgeType } from '../types/network';
import { toNum } from '../utils';

/* ── Map Dynatrace entity tags / name → canonical DeviceRole ── */
function mapDeviceRole(raw: unknown): DeviceRole {
  // raw may be a tags array, a string, or null
  const s = (Array.isArray(raw) ? raw.join(' ') : String(raw ?? '')).toLowerCase();
  if (s.includes('router')) return 'router';
  if (s.includes('switch') || s.includes('catalyst')) return 'switch';
  if (s.includes('firewall') || s.includes('palo') || s.includes('fortinet')) return 'firewall';
  if (s.includes('cloud') || s.includes('gateway') || s.includes('tgw')) return 'cloud-gw';
  if (s.includes('server') || s.includes('host')) return 'server';
  return 'router'; // default fallback for network devices
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

/* ── Scale existing node positions to fit a target canvas ── */
/**
 * Linearly maps node x/y from their current bounding box
 * into [PAD, width-PAD] × [PAD, height-PAD], preserving
 * relative positions.  Used for demo data and as a fallback.
 */
function scaleNodesToFit(
  nodes: TopologyNode[],
  width: number,
  height: number,
): TopologyNode[] {
  if (nodes.length <= 1) {
    // Single node → center it
    return nodes.map(n => ({ ...n, x: width / 2, y: height / 2 }));
  }
  const PAD = 60;
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const srcMinX = Math.min(...xs);
  const srcMaxX = Math.max(...xs);
  const srcMinY = Math.min(...ys);
  const srcMaxY = Math.max(...ys);
  const srcW = srcMaxX - srcMinX || 1;
  const srcH = srcMaxY - srcMinY || 1;
  const tgtW = width - 2 * PAD;
  const tgtH = height - 2 * PAD;
  return nodes.map(n => ({
    ...n,
    x: PAD + ((n.x - srcMinX) / srcW) * tgtW,
    y: PAD + ((n.y - srcMinY) / srcH) * tgtH,
  }));
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
  /** Counts per discovery source for the legend */
  edgeCounts: Record<TopologyEdgeType, number>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Merge edges from multiple discovery sources.
 * LLDP/CDP edges take priority — BGP and flow edges are only added when
 * there is no existing edge between the same pair (regardless of direction).
 */
function mergeEdges(
  lldpEdges: TopologyEdge[],
  bgpEdges: TopologyEdge[],
  flowEdges: TopologyEdge[],
): TopologyEdge[] {
  const seen = new Set<string>();
  const edgeKey = (a: string, b: string) => [a, b].sort().join('↔');
  const result: TopologyEdge[] = [];

  for (const e of lldpEdges) {
    const k = edgeKey(e.source, e.target);
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ ...e, edgeType: 'lldp' });
    }
  }
  for (const e of bgpEdges) {
    const k = edgeKey(e.source, e.target);
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ ...e, edgeType: 'bgp' });
    }
  }
  for (const e of flowEdges) {
    const k = edgeKey(e.source, e.target);
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ ...e, edgeType: 'flow' });
    }
  }
  return result;
}

/**
 * Provides topology nodes + edges from either demo data or live DQL.
 *
 * Live mode runs up to four DQL queries:
 *   1. `topologyNodes` — fetches all network devices with CPU/mem/problem count
 *   2. `topologyEdges` — LLDP/CDP-based interface relationships with utilization
 *   3. `topologyBgpEdges` — BGP peering sessions correlated to device IPs
 *   4. `topologyFlowEdges` — flow-inferred device-to-device communication paths
 *
 * Edges from all sources are merged with LLDP taking priority.
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

  const lldpEdgesResult = useDql(
    { query: NETWORK_QUERIES.topologyEdges },
    { enabled: !demoMode, refetchInterval: 60_000 },
  );

  const bgpEdgesResult = useDql(
    { query: NETWORK_QUERIES.topologyBgpEdges },
    { enabled: !demoMode, refetchInterval: 120_000 },
  );

  const flowEdgesResult = useDql(
    { query: NETWORK_QUERIES.topologyFlowEdges },
    { enabled: !demoMode, refetchInterval: 120_000 },
  );

  const liveData = useMemo(() => {
    if (demoMode) return null;
    const nodeRecords = nodesResult.data?.records;
    if (!nodeRecords) return null;

    // Build nodes (without x/y — layout does that)
    const rawNodes: Omit<TopologyNode, 'x' | 'y'>[] = nodeRecords.map((r: any) => {
      const label = String(r.deviceName ?? r['entity.name'] ?? 'Unknown');
      // Try tags first, then fall back to entity name for role inference
      const roleHint = r.deviceType ?? r.tags ?? label;
      return {
        id: String(r.id ?? ''),
        label,
        role: mapDeviceRole(roleHint),
        health: mapHealth(r.state, toNum(r.problems)),
        ip: String(r.ip ?? ''),
        type: Array.isArray(r.deviceType) ? r.deviceType.join(', ') : String(r.deviceType ?? ''),
        cpu: toNum(r.cpuPct),
        memory: toNum(r.memPct),
      };
    });

    const nodeIds = new Set(rawNodes.map((n) => n.id));

    // Parse LLDP/CDP edges
    const lldpEdges: TopologyEdge[] = (lldpEdgesResult.data?.records ?? []).map((r: any) => ({
      source: String(r.sourceDevice ?? ''),
      target: String(r.targetDevice ?? ''),
      utilization: toNum(r.utilization),
      bandwidth: toNum(r.bandwidth),
      edgeType: 'lldp' as const,
    }));

    // Parse BGP edges (use 0 for utilization/bandwidth since BGP is control-plane)
    const bgpEdges: TopologyEdge[] = (bgpEdgesResult.data?.records ?? []).map((r: any) => ({
      source: String(r.source ?? ''),
      target: String(r.target ?? ''),
      utilization: 0,
      bandwidth: 0,
      edgeType: 'bgp' as const,
    }));

    // Parse flow-inferred edges (traffic amount → rough utilization estimate)
    const flowEdges: TopologyEdge[] = (flowEdgesResult.data?.records ?? []).map((r: any) => ({
      source: String(r.source ?? ''),
      target: String(r.target ?? ''),
      utilization: 0,
      bandwidth: toNum(r.traffic),
      edgeType: 'flow' as const,
    }));

    // Merge all edge sources, then filter to valid node pairs
    const merged = mergeEdges(lldpEdges, bgpEdges, flowEdges);
    const validEdges = merged.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );

    // Auto-layout
    const nodes = layoutNodes(rawNodes, validEdges, width, height);

    // Count edges by type
    const edgeCounts: Record<TopologyEdgeType, number> = { lldp: 0, bgp: 0, flow: 0, manual: 0 };
    for (const e of validEdges) {
      if (e.edgeType) edgeCounts[e.edgeType]++;
    }

    return { nodes, edges: validEdges, edgeCounts };
  }, [
    demoMode,
    nodesResult.data,
    lldpEdgesResult.data,
    bgpEdgesResult.data,
    flowEdgesResult.data,
    width,
    height,
  ]);

  if (demoMode) {
    const scaledNodes = scaleNodesToFit(DEMO_TOPOLOGY_NODES, width, height);
    const demoCounts: Record<TopologyEdgeType, number> = { lldp: DEMO_TOPOLOGY_EDGES.length, bgp: 0, flow: 0, manual: 0 };
    return {
      nodes: scaledNodes,
      edges: DEMO_TOPOLOGY_EDGES,
      edgeCounts: demoCounts,
      isLoading: false,
      error: null,
    };
  }

  const defaultCounts: Record<TopologyEdgeType, number> = { lldp: 0, bgp: 0, flow: 0, manual: 0 };
  return {
    nodes: liveData?.nodes ?? [],
    edges: liveData?.edges ?? [],
    edgeCounts: liveData?.edgeCounts ?? defaultCounts,
    isLoading: nodesResult.isLoading || lldpEdgesResult.isLoading,
    error: nodesResult.error?.message ?? lldpEdgesResult.error?.message ?? null,
  };
}
