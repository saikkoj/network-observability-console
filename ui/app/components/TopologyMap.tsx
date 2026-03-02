import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Paragraph } from '@dynatrace/strato-components/typography';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';

import type { TopologyNode, TopologyEdge, TopologyEdgeType } from '../types/network';

/* ── Colour helpers ───────────────────────────────── */
const HEALTH_COLOR: Record<string, string> = {
  healthy:  '#2ab06f',
  warning:  '#fd8232',
  critical: '#dc172a',
  unknown:  '#73b1ff',
};

/** Edge-type dash patterns and colours (for non-LLDP sources) */
const EDGE_TYPE_META: Record<TopologyEdgeType, { dashArray: string; label: string; color?: string }> = {
  lldp:   { dashArray: 'none',  label: 'LLDP / CDP' },
  bgp:    { dashArray: '8,4',   label: 'BGP Peer',  color: '#73b1ff' },
  flow:   { dashArray: '3,4',   label: 'Flow Inferred', color: '#b388ff' },
  manual: { dashArray: '12,4,2,4', label: 'Manual' },
};

function edgeColor(utilization: number): string {
  if (utilization >= 80) return '#dc172a';
  if (utilization >= 60) return '#fd8232';
  return '#2ab06f';
}

function edgeWidth(utilization: number): number {
  if (utilization >= 80) return 3.5;
  if (utilization >= 60) return 2.5;
  return 1.5;
}

/* ── Node shape renderer ──────────────────────────── */
const NODE_SIZE = 36;

/** Hit-area size — slightly larger than the visible shape so hover is forgiving */
const HIT_PAD = 6;
const HIT_SIZE = NODE_SIZE + HIT_PAD * 2;

function renderNodeShape(
  node: TopologyNode,
  isHovered: boolean,
  onMouseEnter: () => void,
  onMouseLeave: () => void,
): React.ReactElement {
  const fill = HEALTH_COLOR[node.health] ?? HEALTH_COLOR.unknown;
  const stroke = isHovered ? '#fff' : `${fill}60`;
  const strokeWidth = isHovered ? 3 : 1.5;
  const scale = isHovered ? 1.12 : 1;
  const transform = `translate(${node.x}, ${node.y}) scale(${scale})`;

  // Label below the shape
  const label = (
    <text
      textAnchor="middle"
      y={NODE_SIZE / 2 + 16}
      fill="rgba(255,255,255,0.75)"
      fontSize={10}
      fontWeight={600}
      fontFamily="inherit"
      pointerEvents="none"
    >
      {node.label}
    </text>
  );

  // Invisible hit-area rect covers shape + label — events go on the <g>
  const hitArea = (
    <rect
      x={-HIT_SIZE / 2}
      y={-HIT_SIZE / 2}
      width={HIT_SIZE}
      height={HIT_SIZE + 20 /* include label */}
      fill="transparent"
      stroke="none"
    />
  );

  const gProps = {
    key: node.id,
    transform,
    onMouseEnter,
    onMouseLeave,
    style: { cursor: 'pointer', transition: 'all 0.15s ease' } as React.CSSProperties,
  };

  switch (node.role) {
    case 'router':
    case 'cloud-gw':
      return (
        <g {...gProps}>
          {hitArea}
          <circle
            cx={0} cy={0} r={NODE_SIZE / 2}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth}
            pointerEvents="none"
          />
          <text textAnchor="middle" dy={4} fill="#fff" fontSize={16} pointerEvents="none">
            {node.role === 'cloud-gw' ? '☁' : '⬡'}
          </text>
          {label}
        </g>
      );
    case 'firewall':
      return (
        <g {...gProps}>
          {hitArea}
          <rect
            x={-NODE_SIZE / 2} y={-NODE_SIZE / 2}
            width={NODE_SIZE} height={NODE_SIZE} rx={4}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth}
            pointerEvents="none"
          />
          <text textAnchor="middle" dy={4} fill="#fff" fontSize={16} pointerEvents="none">
            🛡
          </text>
          {label}
        </g>
      );
    case 'switch':
      return (
        <g {...gProps}>
          {hitArea}
          <polygon
            points={`0,${-NODE_SIZE / 2} ${NODE_SIZE / 2},0 0,${NODE_SIZE / 2} ${-NODE_SIZE / 2},0`}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth}
            pointerEvents="none"
          />
          <text textAnchor="middle" dy={4} fill="#fff" fontSize={14} pointerEvents="none">
            ⬢
          </text>
          {label}
        </g>
      );
    case 'server':
    default:
      return (
        <g {...gProps}>
          {hitArea}
          <rect
            x={-NODE_SIZE / 2} y={-NODE_SIZE / 2}
            width={NODE_SIZE} height={NODE_SIZE} rx={8}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth}
            pointerEvents="none"
          />
          <text textAnchor="middle" dy={4} fill="#fff" fontSize={14} pointerEvents="none">
            🖥
          </text>
          {label}
        </g>
      );
  }
}

/* ── Tooltip (viewport-clamped, fixed position) ──── */
const TIP_W = 200;
const TIP_H_EST = 160; // estimated max height
const TIP_GAP = 14;

function Tooltip({ node, x, y }: { node: TopologyNode; x: number; y: number }) {
  // Clamp so the tooltip never overflows the viewport edge
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

  let left = x + TIP_GAP;
  let top = y - 8;

  // Flip horizontally if too close to right edge
  if (left + TIP_W > vw - 8) {
    left = x - TIP_W - TIP_GAP;
  }
  // Flip vertically if too close to bottom
  if (top + TIP_H_EST > vh - 8) {
    top = vh - TIP_H_EST - 8;
  }
  // Never above viewport
  if (top < 8) top = 8;
  // Never left of viewport
  if (left < 8) left = 8;

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        background: 'rgba(15,17,22,0.96)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 8,
        padding: '10px 14px',
        zIndex: 99999,
        fontSize: 12,
        lineHeight: 1.6,
        pointerEvents: 'none',
        minWidth: TIP_W,
        maxWidth: 280,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        color: '#fff',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{node.label}</div>
      <div>IP: <span style={{ fontFamily: 'monospace' }}>{node.ip ?? '—'}</span></div>
      <div>Type: {node.type}</div>
      <div>Role: {node.role}</div>
      <div>Health: <span style={{ color: HEALTH_COLOR[node.health], fontWeight: 600 }}>{node.health.toUpperCase()}</span></div>
      {node.cpu !== undefined && <div>CPU: {node.cpu}%</div>}
      {node.memory !== undefined && <div>Memory: {node.memory}%</div>}
    </div>
  );
}

/* ── Main TopologyMap ─────────────────────────────── */
interface TopologyMapProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  edgeCounts?: Record<TopologyEdgeType, number>;
  height?: number;
  mini?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export const TopologyMap = ({ nodes, edges, edgeCounts, height = 500, mini = false, isLoading = false, error = null }: TopologyMapProps) => {

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute SVG viewBox to fit all nodes with padding
  const viewBox = useMemo(() => {
    if (nodes.length === 0) return '0 0 800 500';
    const pad = 40;
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const maxX = Math.max(...xs) + pad;
    const maxY = Math.max(...ys) + pad;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [nodes]);

  const nodeById = useMemo(() => {
    const map: Record<string, TopologyNode> = {};
    nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [nodes]);

  const handleNodeMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const hoveredNodeData = hoveredNode ? nodeById[hoveredNode] : null;

  if (isLoading) {
    return (
      <Flex alignItems="center" justifyContent="center" style={{ height, opacity: 0.5 }}>
        <Paragraph>Loading topology…</Paragraph>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex alignItems="center" justifyContent="center" style={{ height, opacity: 0.5 }}>
        <Paragraph>Topology error: {error}</Paragraph>
      </Flex>
    );
  }

  if (nodes.length === 0) {
    return (
      <Flex alignItems="center" justifyContent="center" style={{ height, opacity: 0.5 }}>
        <Paragraph>No topology data available — switch to Demo mode or wait for live data.</Paragraph>
      </Flex>
    );
  }

  return (
    <>
    <div
      style={{
        position: 'relative',
        background: Colors.Background.Surface.Default,
        borderRadius: mini ? 8 : Borders.Radius.Container.Default,
        border: `1px solid ${Colors.Border.Neutral.Default}`,
        boxShadow: mini ? 'none' : BoxShadows.Surface.Raised.Rest,
        overflow: 'hidden',
        height,
      }}
      onMouseMove={handleNodeMouseMove}
    >
      {/* Legend (full mode only) */}
      {!mini && (
        <div
          style={{
            position: 'absolute', top: 12, left: 16, zIndex: 10,
            background: 'rgba(15,17,22,0.85)', borderRadius: 8,
            padding: '8px 12px', fontSize: 10, lineHeight: 1.8,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Node Health</div>
          {Object.entries(HEALTH_COLOR).map(([key, col]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: col }} />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </div>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⬡</span> Router / Cloud GW
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⬢</span> Switch
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🛡</span> Firewall
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🖥</span> Server
          </div>

          {/* Edge type legend — only show types that have edges */}
          {edgeCounts && Object.values(edgeCounts).some(c => c > 0) && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Link Source</div>
              {(Object.entries(EDGE_TYPE_META) as [TopologyEdgeType, typeof EDGE_TYPE_META[TopologyEdgeType]][])
                .filter(([type]) => (edgeCounts[type] ?? 0) > 0)
                .map(([type, meta]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width={24} height={6}>
                      <line
                        x1={0} y1={3} x2={24} y2={3}
                        stroke={meta.color ?? '#2ab06f'}
                        strokeWidth={2}
                        strokeDasharray={meta.dashArray === 'none' ? undefined : meta.dashArray}
                      />
                    </svg>
                    {meta.label} ({edgeCounts[type]})
                  </div>
                ))}
            </>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={viewBox}
        style={{ display: 'block' }}
      >
        {/* Edges */}
        {edges.map((edge) => {
          const src = nodeById[edge.source];
          const tgt = nodeById[edge.target];
          if (!src || !tgt) return null;
          const eType = edge.edgeType ?? 'lldp';
          const meta = EDGE_TYPE_META[eType];
          // LLDP edges use utilization-based colour; others use their fixed colour
          const col = eType === 'lldp' ? edgeColor(edge.utilization) : (meta.color ?? edgeColor(edge.utilization));
          const w = eType === 'lldp' ? edgeWidth(edge.utilization) : 1.5;
          const isConnectedToHover =
            hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);
          return (
            <line
              key={edge.id ?? `${edge.source}-${edge.target}-${eType}`}
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke={col}
              strokeWidth={isConnectedToHover ? w + 1.5 : w}
              strokeOpacity={hoveredNode ? (isConnectedToHover ? 1 : 0.25) : 0.7}
              strokeLinecap="round"
              strokeDasharray={meta.dashArray === 'none' ? undefined : meta.dashArray}
              style={{ transition: 'all 0.15s ease' }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) =>
          renderNodeShape(
            node,
            hoveredNode === node.id,
            () => setHoveredNode(node.id),
            () => setHoveredNode(null),
          )
        )}
      </svg>
    </div>

    {/* Tooltip rendered outside the overflow:hidden container */}
    {!mini && hoveredNodeData && (
      <Tooltip node={hoveredNodeData} x={tooltipPos.x} y={tooltipPos.y} />
    )}
    </>
  );
};
