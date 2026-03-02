/**
 * ClusterMap — Geographic cluster visualization using strato-geo MapView + BubbleLayer.
 *
 * Each cluster is a bubble on a real geographic map, sized by entity count and
 * colored by health status. Supports controlled viewState for auto-zoom on
 * drill-down. Always renders the map even with zero regions (empty map background).
 */
import React, { useMemo, useCallback } from 'react';
import { MapView, BubbleLayer, CategoricalLegend } from '@dynatrace/strato-geo';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import type { TopologyCluster, HealthSummary } from '../types/network';

/* ── Health → hex colour (raw hex only — CSS vars crash strato-geo) ── */
const HEALTH_HEX = {
  healthy: '#2ab06f',
  warning: '#fd8232',
  critical: '#dc172a',
  unknown: '#555555',
} as const;

function clusterHealthKey(hs: HealthSummary): keyof typeof HEALTH_HEX {
  const total = hs.healthy + hs.warning + hs.critical + hs.unknown;
  if (total === 0) return 'unknown';
  if (hs.critical / total > 0.04) return 'critical';
  if (hs.warning / total > 0.08) return 'warning';
  return 'healthy';
}

/* ── BubbleLayer data point type ── */
interface ClusterBubble {
  latitude: number;
  longitude: number;
  entityCount: number;
  health: keyof typeof HEALTH_HEX;
  label: string;
  id: string;
  healthSummary: HealthSummary;
  avgCpu?: number;
  avgMemory?: number;
  alertCount: number;
}

/* ── View state ── */
export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}

/* Default Finland centre */
export const FINLAND_CENTER: MapViewState = { latitude: 63.0, longitude: 25.0, zoom: 4.5 };

/* ── Props ── */
interface ClusterMapProps {
  regions: TopologyCluster[];
  onRegionClick?: (regionId: string) => void;
  height?: number | string;
  mini?: boolean;
  /** Controlled view state — map auto-pans/zooms to this position */
  viewState?: MapViewState;
  /** Hide legend */
  hideLegend?: boolean;
}

export const ClusterMap = ({
  regions,
  onRegionClick,
  height = 600,
  mini = false,
  viewState,
  hideLegend = false,
}: ClusterMapProps) => {
  /* Transform cluster data into BubbleLayer data points */
  const bubbleData = useMemo<ClusterBubble[]>(
    () =>
      regions.map((r) => ({
        latitude: r.lat,
        longitude: r.lon,
        entityCount: r.deviceCount,
        health: clusterHealthKey(r.healthSummary),
        label: r.label,
        id: r.id,
        healthSummary: r.healthSummary,
        avgCpu: r.avgCpu,
        avgMemory: r.avgMemory,
        alertCount: r.alertCount,
      })),
    [regions],
  );

  /* Default centre computed from regions */
  const defaultCenter = useMemo<MapViewState>(() => {
    if (regions.length === 0) return FINLAND_CENTER;
    const avgLat = regions.reduce((s, r) => s + r.lat, 0) / regions.length;
    const avgLon = regions.reduce((s, r) => s + r.lon, 0) / regions.length;
    const latRange =
      Math.max(...regions.map((r) => r.lat)) - Math.min(...regions.map((r) => r.lat));
    const zoom = latRange > 5 ? 4.5 : latRange > 2 ? 5.5 : 6.5;
    return { latitude: avgLat, longitude: avgLon, zoom: mini ? zoom - 0.5 : zoom };
  }, [regions, mini]);

  /* Colour callback — raw hex only */
  const colorAccessor = useCallback(
    (item: ClusterBubble) => HEALTH_HEX[item.health],
    [],
  );

  /* Drill-down handler */
  const handleDrill = useCallback(
    (id: string) => { onRegionClick?.(id); },
    [onRegionClick],
  );

  /* CategoricalLegend colour palette */
  const legendPalette: Record<string, string> = {
    Healthy: HEALTH_HEX.healthy,
    Warning: HEALTH_HEX.warning,
    Critical: HEALTH_HEX.critical,
  };

  /* Use controlled viewState when provided, otherwise uncontrolled initialViewState */
  const mapProps = viewState
    ? { viewState }
    : { initialViewState: defaultCenter };

  return (
    <div
      style={{
        borderRadius: mini
          ? `0 0 ${Borders.Radius.Container.Default} ${Borders.Radius.Container.Default}`
          : Borders.Radius.Container.Default,
        border: mini ? undefined : `1px solid ${Colors.Border.Neutral.Default}`,
        borderTop: mini ? `1px solid ${Colors.Border.Neutral.Default}` : undefined,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <MapView height={height} {...mapProps}>
        {bubbleData.length > 0 && (
          <BubbleLayer
            data={bubbleData}
            color={colorAccessor}
            scale="log"
            radius={(item: ClusterBubble) => item.entityCount}
            radiusRange={mini ? [8, 28] : [14, 50]}
            sizeInterpolation="fixed"
          >
            <BubbleLayer.Tooltip>
              {(closestDot) => {
                const d = closestDot.data as ClusterBubble;
                const hs = d.healthSummary;
                const total = hs.healthy + hs.warning + hs.critical + hs.unknown;
                return (
                  <div style={{ padding: '4px 2px', minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 3 }}>
                      Entities: <b>{d.entityCount.toLocaleString()}</b>
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: HEALTH_HEX.healthy }}>● {hs.healthy} ok</span>
                      <span style={{ color: HEALTH_HEX.warning }}>● {hs.warning} warn</span>
                      <span style={{ color: HEALTH_HEX.critical }}>● {hs.critical} crit</span>
                    </div>
                    {total > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          height: 4,
                          borderRadius: 2,
                          overflow: 'hidden',
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ width: `${(hs.healthy / total) * 100}%`, background: HEALTH_HEX.healthy }} />
                        <div style={{ width: `${(hs.warning / total) * 100}%`, background: HEALTH_HEX.warning }} />
                        <div style={{ width: `${(hs.critical / total) * 100}%`, background: HEALTH_HEX.critical }} />
                      </div>
                    )}
                    {d.avgCpu != null && (
                      <div style={{ fontSize: 11, opacity: 0.7 }}>
                        CPU: {d.avgCpu}% · Mem: {d.avgMemory ?? 0}%
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 11,
                        color: d.alertCount > 3 ? HEALTH_HEX.warning : undefined,
                        opacity: d.alertCount > 3 ? 1 : 0.7,
                      }}
                    >
                      Alerts: <b>{d.alertCount}</b>
                    </div>
                    {onRegionClick && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: '4px 0',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#73b1ff',
                          cursor: 'pointer',
                          textAlign: 'center',
                          borderTop: '1px solid rgba(255,255,255,0.1)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDrill(d.id);
                        }}
                      >
                        Drill Down →
                      </div>
                    )}
                  </div>
                );
              }}
            </BubbleLayer.Tooltip>
          </BubbleLayer>
        )}

        {!mini && !hideLegend && <CategoricalLegend colorPalette={legendPalette} position="bottom" />}
      </MapView>
    </div>
  );
};
