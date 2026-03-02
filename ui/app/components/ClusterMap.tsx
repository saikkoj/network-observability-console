/**
 * ClusterMap — SVG-based cluster visualization for regional network clusters.
 *
 * Auto-centers on the data's geographic bounds. Each cluster is a circle
 * sized by entity count and colored by health status.
 * No external mapping libraries — pure SVG for maximum reliability.
 */
import React, { useMemo, useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Paragraph } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import type { TopologyCluster, HealthSummary } from '../types/network';

/* ── Health → colour ── */
function clusterColor(hs: HealthSummary): string {
  const total = hs.healthy + hs.warning + hs.critical + hs.unknown;
  if (total === 0) return '#555';
  if (hs.critical / total > 0.04) return '#dc172a';
  if (hs.warning / total > 0.08) return '#fd8232';
  return '#2ab06f';
}

/* ── Bubble radius (log scale, clamped) ── */
function bubbleRadius(count: number, mini: boolean): number {
  const min = mini ? 10 : 16;
  const max = mini ? 28 : 50;
  if (count <= 0) return min;
  const log = Math.log(count + 1);
  const maxLog = Math.log(500);
  return min + (max - min) * Math.min(log / maxLog, 1);
}

/* ── Simple Mercator latitude → Y ── */
function mercatorY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

/* ── Projected cluster for internal use ── */
interface ProjectedCluster extends TopologyCluster {
  cx: number;
  cy: number;
}

/* ── Props ── */
interface ClusterMapProps {
  regions: TopologyCluster[];
  onRegionClick?: (regionId: string) => void;
  height?: number;
  mini?: boolean;
}

const SVG_W = 800;
const SVG_H = 600;

export const ClusterMap = ({
  regions,
  onRegionClick,
  height = 600,
  mini = false,
}: ClusterMapProps) => {
  const [hovered, setHovered] = useState<string | null>(null);

  /* Project lat/lon into SVG coordinate space */
  const projected = useMemo<ProjectedCluster[]>(() => {
    if (regions.length === 0) return [];

    const pad = 80;
    const lons = regions.map((r) => r.lon);
    const lats = regions.map((r) => r.lat);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minY = mercatorY(Math.min(...lats));
    const maxY = mercatorY(Math.max(...lats));

    const lonRange = Math.max(maxLon - minLon, 0.5);
    const yRange = Math.max(maxY - minY, 0.01);

    const usableW = SVG_W - pad * 2;
    const usableH = SVG_H - pad * 2;

    const scaleX = usableW / lonRange;
    const scaleY = usableH / yRange;
    const scale = Math.min(scaleX, scaleY);

    const projectedW = lonRange * scale;
    const projectedH = yRange * scale;
    const offX = pad + (usableW - projectedW) / 2;
    const offY = pad + (usableH - projectedH) / 2;

    return regions.map((r) => ({
      ...r,
      cx: offX + (r.lon - minLon) * scale,
      cy: offY + (maxY - mercatorY(r.lat)) * scale,
    }));
  }, [regions]);

  if (regions.length === 0) {
    return (
      <Flex
        alignItems="center"
        justifyContent="center"
        style={{ height, opacity: 0.5 }}
      >
        <Paragraph>No cluster data available.</Paragraph>
      </Flex>
    );
  }

  const hovCluster = projected.find((p) => p.id === hovered);

  return (
    <div
      style={{
        position: 'relative',
        height,
        background: '#0b1425',
        borderRadius: mini
          ? `0 0 ${Borders.Radius.Container.Default} ${Borders.Radius.Container.Default}`
          : Borders.Radius.Container.Default,
        border: mini ? undefined : `1px solid ${Colors.Border.Neutral.Default}`,
        borderTop: mini ? `1px solid ${Colors.Border.Neutral.Default}` : undefined,
        overflow: 'hidden',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Subtle grid dots for visual depth */}
        <defs>
          <pattern
            id="clusterGrid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="20" cy="20" r="0.6" fill="rgba(115,177,255,0.12)" />
          </pattern>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(115,177,255,0.06)" />
            <stop offset="100%" stopColor="rgba(115,177,255,0)" />
          </radialGradient>
        </defs>
        <rect width={SVG_W} height={SVG_H} fill="url(#bgGlow)" />
        <rect width={SVG_W} height={SVG_H} fill="url(#clusterGrid)" />

        {/* Connection lines between nearby clusters */}
        {projected.map((a, i) =>
          projected.slice(i + 1).map((b) => {
            const dx = a.cx - b.cx;
            const dy = a.cy - b.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 350) return null;
            return (
              <line
                key={`e-${a.id}-${b.id}`}
                x1={a.cx}
                y1={a.cy}
                x2={b.cx}
                y2={b.cy}
                stroke="rgba(115,177,255,0.10)"
                strokeWidth={1}
                strokeDasharray="4,8"
              />
            );
          }),
        )}

        {/* Cluster bubbles */}
        {projected.map((r) => {
          const color = clusterColor(r.healthSummary);
          const radius = bubbleRadius(r.deviceCount, mini);
          const isHov = hovered === r.id;

          return (
            <g
              key={r.id}
              style={{ cursor: onRegionClick ? 'pointer' : 'default' }}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onRegionClick?.(r.id)}
            >
              {/* Outer glow ring on hover */}
              {isHov && (
                <circle
                  cx={r.cx}
                  cy={r.cy}
                  r={radius + 8}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.35}
                />
              )}
              {/* Main bubble */}
              <circle
                cx={r.cx}
                cy={r.cy}
                r={isHov ? radius * 1.08 : radius}
                fill={`${color}25`}
                stroke={color}
                strokeWidth={2}
              />
              {/* Entity count */}
              <text
                x={r.cx}
                y={r.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={mini ? 11 : 14}
                fontWeight={700}
                style={{ pointerEvents: 'none' }}
              >
                {r.deviceCount}
              </text>
              {/* Region label below bubble */}
              {!mini && (
                <text
                  x={r.cx}
                  y={r.cy + radius + 16}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.65)"
                  fontSize={11}
                  style={{ pointerEvents: 'none' }}
                >
                  {r.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip panel (fixed position, avoids layout jitter) */}
      {hovCluster && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(10,20,40,0.95)',
            border: `1px solid ${Colors.Border.Neutral.Default}`,
            borderRadius: Borders.Radius.Container.Default,
            padding: '12px 16px',
            minWidth: 210,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: '#fff',
              marginBottom: 6,
            }}
          >
            {hovCluster.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.7)',
              marginBottom: 4,
            }}
          >
            Entities:{' '}
            <b style={{ color: '#fff' }}>
              {hovCluster.deviceCount.toLocaleString()}
            </b>
          </div>
          <Flex gap={12} style={{ fontSize: 11, marginBottom: 6 }}>
            <span style={{ color: '#2ab06f' }}>
              ● {hovCluster.healthSummary.healthy} healthy
            </span>
            <span style={{ color: '#fd8232' }}>
              ● {hovCluster.healthSummary.warning} warning
            </span>
            <span style={{ color: '#dc172a' }}>
              ● {hovCluster.healthSummary.critical} critical
            </span>
          </Flex>
          {/* Health bar */}
          {(() => {
            const hs = hovCluster.healthSummary;
            const total = hs.healthy + hs.warning + hs.critical + hs.unknown;
            if (total === 0) return null;
            return (
              <div
                style={{
                  display: 'flex',
                  height: 5,
                  borderRadius: 3,
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: `${(hs.healthy / total) * 100}%`,
                    background: '#2ab06f',
                  }}
                />
                <div
                  style={{
                    width: `${(hs.warning / total) * 100}%`,
                    background: '#fd8232',
                  }}
                />
                <div
                  style={{
                    width: `${(hs.critical / total) * 100}%`,
                    background: '#dc172a',
                  }}
                />
              </div>
            );
          })()}
          {hovCluster.avgCpu != null && (
            <div
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}
            >
              CPU: {hovCluster.avgCpu}% &bull; Mem:{' '}
              {hovCluster.avgMemory ?? 0}%
            </div>
          )}
          <div
            style={{
              fontSize: 11,
              color:
                hovCluster.alertCount > 3
                  ? '#fd8232'
                  : 'rgba(255,255,255,0.6)',
              marginTop: 2,
            }}
          >
            Alerts: <b>{hovCluster.alertCount}</b>
          </div>
          {onRegionClick && (
            <Button
              variant="accent"
              onClick={() => onRegionClick(hovCluster.id)}
              style={{ marginTop: 8, width: '100%' }}
            >
              Drill Down →
            </Button>
          )}
        </div>
      )}

      {/* Legend */}
      {!mini && (
        <Flex
          gap={16}
          alignItems="center"
          justifyContent="center"
          style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            fontSize: 12,
          }}
        >
          <Flex alignItems="center" gap={4}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#2ab06f',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Healthy</span>
          </Flex>
          <Flex alignItems="center" gap={4}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#fd8232',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Warning</span>
          </Flex>
          <Flex alignItems="center" gap={4}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#dc172a',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Critical</span>
          </Flex>
        </Flex>
      )}
    </div>
  );
};
