/**
 * FinlandMap — Strato MapView with BubbleLayer for regional cluster markers.
 *
 * Scalable architecture supports 80 000+ entities via hierarchical clustering.
 * Each region is a bubble sized by deviceCount and coloured by health.
 * Uses @dynatrace/strato-geo MapView + BubbleLayer.
 */
import React, { useMemo, useCallback, type ReactNode } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Paragraph } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { MapView, BubbleLayer, CategoricalLegend } from '@dynatrace/strato-geo';
import type { BubbleLayerTooltipData } from '@dynatrace/strato-geo';
import type { TopologyCluster, HealthSummary } from '../types/network';

/* ── Health → colour mapping (raw hex — MapLibre WebGL requires resolved colours) ── */
function clusterColor(hs: HealthSummary): string {
  const total = hs.healthy + hs.warning + hs.critical + hs.unknown;
  if (total === 0) return '#555555';
  const critRatio = hs.critical / total;
  const warnRatio = hs.warning / total;
  if (critRatio > 0.04) return '#dc172a';
  if (warnRatio > 0.08) return '#fd8232';
  return '#2ab06f';
}

/* ── Health label for legend ── */
function healthLabel(hs: HealthSummary): string {
  const total = hs.healthy + hs.warning + hs.critical + hs.unknown;
  if (total === 0) return 'Unknown';
  const critRatio = hs.critical / total;
  const warnRatio = hs.warning / total;
  if (critRatio > 0.04) return 'Critical';
  if (warnRatio > 0.08) return 'Warning';
  return 'Healthy';
}

/* ── Bubble data shape for BubbleLayer ── */
interface RegionBubble {
  latitude: number;
  longitude: number;
  deviceCount: number;
  cluster: TopologyCluster;
  healthStatus: string;
}

/* ── Props ── */
interface FinlandMapProps {
  regions: TopologyCluster[];
  onRegionClick?: (regionId: string) => void;
  height?: number | string;
  mini?: boolean;
}

/* ── Finland centre coordinates & zoom ── */
const FINLAND_CENTER = { latitude: 64.5, longitude: 26.0 };
const FINLAND_ZOOM_FULL = 4.6;
const FINLAND_ZOOM_MINI = 3.8;

export const FinlandMap = ({
  regions,
  onRegionClick,
  height = 600,
  mini = false,
}: FinlandMapProps) => {
  /* Transform cluster data into BubbleLayer format */
  const bubbleData = useMemo<RegionBubble[]>(
    () =>
      regions.map((r) => ({
        latitude: r.lat,
        longitude: r.lon,
        deviceCount: r.deviceCount,
        cluster: r,
        healthStatus: healthLabel(r.healthSummary),
      })),
    [regions],
  );

  /* Colour accessor for each bubble */
  const colorAccessor = useCallback(
    (item: RegionBubble) => clusterColor(item.cluster.healthSummary),
    [],
  );

  /* Radius accessor — returns device count; BubbleLayer scales it with radiusRange */
  const radiusAccessor = useCallback((item: RegionBubble) => item.deviceCount, []);

  /* Custom tooltip renderer */
  const renderTooltip = useCallback(
    (closest: BubbleLayerTooltipData<RegionBubble>): ReactNode => {
      const c = closest.data.cluster;
      const hs = c.healthSummary;
      const total = hs.healthy + hs.warning + hs.critical + hs.unknown;

      return (
        <Flex flexDirection="column" gap={4} style={{ minWidth: 200, padding: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.label}</div>
          <div style={{ fontSize: 12 }}>
            Entities: <b>{c.deviceCount.toLocaleString()}</b>
          </div>
          <Flex gap={12} style={{ fontSize: 11 }}>
            <span style={{ color: '#2ab06f' }}>
              ● {hs.healthy.toLocaleString()} healthy
            </span>
            <span style={{ color: '#fd8232' }}>
              ● {hs.warning.toLocaleString()} warning
            </span>
            <span style={{ color: '#dc172a' }}>
              ● {hs.critical.toLocaleString()} critical
            </span>
          </Flex>
          {/* Mini health bar */}
          {total > 0 && (
            <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${(hs.healthy / total) * 100}%`, background: '#2ab06f' }} />
              <div style={{ width: `${(hs.warning / total) * 100}%`, background: '#fd8232' }} />
              <div style={{ width: `${(hs.critical / total) * 100}%`, background: '#dc172a' }} />
            </div>
          )}
          {c.avgCpu !== undefined && (
            <div style={{ fontSize: 11 }}>Avg CPU: {c.avgCpu}%</div>
          )}
          {c.avgMemory !== undefined && (
            <div style={{ fontSize: 11 }}>Avg Memory: {c.avgMemory}%</div>
          )}
          <div style={{ fontSize: 11 }}>
            Alerts: <b>{c.alertCount}</b>
          </div>
          {onRegionClick && (
            <Button
              variant="accent"
              onClick={() => onRegionClick(c.id)}
              style={{ marginTop: 4 }}
            >
              Drill Down →
            </Button>
          )}
        </Flex>
      );
    },
    [onRegionClick],
  );

  if (regions.length === 0) {
    return (
      <Flex alignItems="center" justifyContent="center" style={{ height, opacity: 0.5 }}>
        <Paragraph>No cluster data available.</Paragraph>
      </Flex>
    );
  }

  return (
    <MapView
      height={height}
      initialViewState={{
        latitude: FINLAND_CENTER.latitude,
        longitude: FINLAND_CENTER.longitude,
        zoom: mini ? FINLAND_ZOOM_MINI : FINLAND_ZOOM_FULL,
      }}
    >
      <BubbleLayer
        data={bubbleData}
        color={colorAccessor}
        scale="log"
        radius={radiusAccessor}
        radiusRange={mini ? [6, 24] : [10, 40]}
        sizeInterpolation="fixed"
      >
        <BubbleLayer.Tooltip>
          {(closest) => renderTooltip(closest as BubbleLayerTooltipData<RegionBubble>)}
        </BubbleLayer.Tooltip>
      </BubbleLayer>

      {!mini && (
        <CategoricalLegend
          colorPalette={{
            Healthy: '#2ab06f',
            Warning: '#fd8232',
            Critical: '#dc172a',
          }}
        />
      )}
    </MapView>
  );
};
