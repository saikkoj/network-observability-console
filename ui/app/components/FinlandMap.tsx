/**
 * FinlandMap — SVG-based Finland map with interactive regional cluster markers.
 *
 * Supports 80 000+ entities via hierarchical clustering.
 * Each region is a circle sized by sqrt(deviceCount) and coloured by health.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Paragraph } from '@dynatrace/strato-components/typography';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import type { TopologyCluster, HealthSummary } from '../types/network';
import { FINLAND_OUTLINE } from '../data/demoData';

/* ── Health → colour mapping ── */
function clusterColor(hs: HealthSummary): string {
  const total = hs.healthy + hs.warning + hs.critical + hs.unknown;
  if (total === 0) return '#555';
  const critRatio = hs.critical / total;
  const warnRatio = hs.warning / total;
  if (critRatio > 0.04) return '#dc172a'; // red
  if (warnRatio > 0.08) return '#fd8232'; // amber
  return '#2ab06f';                        // green
}

function clusterGlow(hs: HealthSummary): string {
  const c = clusterColor(hs);
  return `0 0 14px 3px ${c}55, 0 0 6px 1px ${c}33`;
}

/* ── Bubble radius from device count (sqrt scale) ── */
const MIN_R = 8;
const MAX_R = 36;
function bubbleRadius(count: number, maxCount: number): number {
  if (maxCount <= 0) return MIN_R;
  return MIN_R + (MAX_R - MIN_R) * Math.sqrt(count / maxCount);
}

/* ── Format large numbers ── */
function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

/* ── Tooltip ── */
const TIP_W = 240;
function Tooltip({ cluster, x, y }: { cluster: TopologyCluster; x: number; y: number }) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  let left = x + 16;
  let top = y - 8;
  if (left + TIP_W > vw - 8) left = x - TIP_W - 16;
  if (top + 200 > vh - 8) top = vh - 208;
  if (top < 8) top = 8;
  if (left < 8) left = 8;

  const hs = cluster.healthSummary;
  const total = hs.healthy + hs.warning + hs.critical + hs.unknown;

  return (
    <div
      style={{
        position: 'fixed', left, top, zIndex: 99999, pointerEvents: 'none',
        background: 'rgba(15,17,22,0.96)', border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 8, padding: '12px 16px', fontSize: 12, lineHeight: 1.7,
        minWidth: TIP_W, maxWidth: 300, color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{cluster.label}</div>
      <div>Entities: <b>{cluster.deviceCount.toLocaleString()}</b></div>
      <div style={{ display: 'flex', gap: 12, margin: '6px 0' }}>
        <span style={{ color: '#2ab06f' }}>● {hs.healthy.toLocaleString()} healthy</span>
        <span style={{ color: '#fd8232' }}>● {hs.warning.toLocaleString()} warning</span>
        <span style={{ color: '#dc172a' }}>● {hs.critical.toLocaleString()} critical</span>
      </div>
      {/* Mini health bar */}
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${(hs.healthy / total) * 100}%`, background: '#2ab06f' }} />
        <div style={{ width: `${(hs.warning / total) * 100}%`, background: '#fd8232' }} />
        <div style={{ width: `${(hs.critical / total) * 100}%`, background: '#dc172a' }} />
      </div>
      {cluster.avgCpu !== undefined && <div>Avg CPU: {cluster.avgCpu}%</div>}
      {cluster.avgMemory !== undefined && <div>Avg Memory: {cluster.avgMemory}%</div>}
      <div>Active Alerts: <span style={{ color: cluster.alertCount > 10 ? '#dc172a' : '#fd8232', fontWeight: 600 }}>{cluster.alertCount}</span></div>
      <div style={{ marginTop: 6, opacity: 0.6, fontSize: 10 }}>Click to drill down →</div>
    </div>
  );
}

/* ── Finland outline path string ── */
const outlinePath = useMemoOutline();
function useMemoOutline(): string {
  if (FINLAND_OUTLINE.length === 0) return '';
  return FINLAND_OUTLINE.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
}

/* ── Props ── */
interface FinlandMapProps {
  regions: TopologyCluster[];
  onRegionClick?: (regionId: string) => void;
  height?: number;
  mini?: boolean;
  totalEntities?: number;
}

export const FinlandMap = ({
  regions,
  onRegionClick,
  height = 600,
  mini = false,
  totalEntities,
}: FinlandMapProps) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

  const maxCount = useMemo(() => Math.max(...regions.map(r => r.deviceCount), 1), [regions]);
  const hoveredCluster = useMemo(() => regions.find(r => r.id === hovered) ?? null, [regions, hovered]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTipPos({ x: e.clientX, y: e.clientY });
  }, []);

  if (regions.length === 0) {
    return (
      <Flex alignItems="center" justifyContent="center" style={{ height, opacity: 0.5 }}>
        <Paragraph>No cluster data available.</Paragraph>
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
        onMouseMove={handleMouseMove}
      >
        {/* Total entity badge (full mode) */}
        {!mini && totalEntities != null && (
          <div
            style={{
              position: 'absolute', top: 14, right: 18, zIndex: 10,
              background: 'rgba(15,17,22,0.88)', borderRadius: 8,
              padding: '8px 16px', fontSize: 11,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: -0.5, color: '#73b1ff' }}>
              {totalEntities.toLocaleString()}
            </div>
            <div style={{ opacity: 0.6, fontSize: 10 }}>Monitored Entities</div>
          </div>
        )}

        {/* Legend (full mode) */}
        {!mini && (
          <div
            style={{
              position: 'absolute', top: 14, left: 16, zIndex: 10,
              background: 'rgba(15,17,22,0.88)', borderRadius: 8,
              padding: '8px 14px', fontSize: 10, lineHeight: 1.8,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Cluster Health</div>
            {[
              { label: 'Healthy', color: '#2ab06f' },
              { label: 'Warning', color: '#fd8232' },
              { label: 'Critical', color: '#dc172a' },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}55` }} />
                {label}
              </div>
            ))}
            <div style={{ marginTop: 4, opacity: 0.5 }}>Size = entity count</div>
          </div>
        )}

        <svg
          width="100%"
          height="100%"
          viewBox="-20 -10 440 770"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
        >
          {/* Subtle grid */}
          <defs>
            <pattern id="fi-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(115,177,255,0.04)" strokeWidth="0.5" />
            </pattern>
            {/* Glow filter for critical clusters */}
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-green">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <rect x="-20" y="-10" width="440" height="770" fill="url(#fi-grid)" />

          {/* Finland outline */}
          <path
            d={outlinePath}
            fill="rgba(115,177,255,0.05)"
            stroke="rgba(115,177,255,0.25)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Region cluster markers */}
          {regions.map((region) => {
            const r = bubbleRadius(region.deviceCount, maxCount);
            const col = clusterColor(region.healthSummary);
            const isHovered = hovered === region.id;
            const scale = isHovered ? 1.15 : 1;

            return (
              <g
                key={region.id}
                transform={`translate(${region.x}, ${region.y}) scale(${scale})`}
                style={{ cursor: 'pointer', transition: 'transform 0.12s ease' }}
                onMouseEnter={() => setHovered(region.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onRegionClick?.(region.id)}
              >
                {/* Outer glow ring */}
                <circle
                  cx={0} cy={0} r={r + 4}
                  fill="none"
                  stroke={col}
                  strokeWidth={1}
                  strokeOpacity={isHovered ? 0.6 : 0.2}
                  style={{ transition: 'stroke-opacity 0.15s ease' }}
                />
                {/* Main bubble */}
                <circle
                  cx={0} cy={0} r={r}
                  fill={col}
                  fillOpacity={isHovered ? 0.85 : 0.65}
                  stroke={isHovered ? '#fff' : col}
                  strokeWidth={isHovered ? 2 : 1}
                  filter={region.healthSummary.critical > region.deviceCount * 0.04 ? 'url(#glow-red)' : undefined}
                  style={{ transition: 'fill-opacity 0.15s ease, stroke-width 0.15s ease' }}
                />
                {/* Device count label */}
                {!mini && (
                  <text
                    textAnchor="middle"
                    dy={r > 16 ? 4 : 3}
                    fill="#fff"
                    fontSize={r > 20 ? 11 : 9}
                    fontWeight={700}
                    pointerEvents="none"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                  >
                    {fmtCount(region.deviceCount)}
                  </text>
                )}
                {/* Region name below */}
                {!mini && (
                  <text
                    textAnchor="middle"
                    y={r + 14}
                    fill="rgba(255,255,255,0.7)"
                    fontSize={9}
                    fontWeight={600}
                    pointerEvents="none"
                  >
                    {region.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {!mini && hoveredCluster && (
        <Tooltip cluster={hoveredCluster} x={tipPos.x} y={tipPos.y} />
      )}
    </>
  );
};
