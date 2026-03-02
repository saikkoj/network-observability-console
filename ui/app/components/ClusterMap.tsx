/**
 * ClusterMap — Geographic cluster visualization using strato-geo MapView + BubbleLayer.
 *
 * Each cluster is a bubble on a real geographic map, sized by entity count and
 * colored by health status. Uses color="legend" + valueAccessor to tie BubbleLayer
 * to CategoricalLegend (matching the documented strato-geo pattern).
 */
import React, { useMemo, useCallback } from 'react';
import { MapView, BubbleLayer, CategoricalLegend } from '@dynatrace/strato-geo';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import type { TopologyCluster, HealthSummary } from '../types/network';

/* ── Health → hex colour (raw hex only — CSS vars crash strato-geo) ── */
const HEALTH_HEX = {
  Healthy: '#2ab06f',
  Warning: '#fd8232',
  Critical: '#dc172a',
  Unknown: '#555555',
} as const;

type HealthKey = keyof typeof HEALTH_HEX;

function clusterHealthKey(hs: HealthSummary): HealthKey {
  const total = hs.healthy + hs.warning + hs.critical + hs.unknown;
  if (total === 0) return 'Unknown';
  if (hs.critical / total > 0.04) return 'Critical';
  if (hs.warning / total > 0.08) return 'Warning';
  return 'Healthy';
}

/* ── BubbleLayer data point type ── */
interface ClusterBubble {
  latitude: number;
  longitude: number;
  entityCount: number;
  /** Health category — must match CategoricalLegend palette keys */
  health: HealthKey;
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

/* CategoricalLegend palette — keys must match the `health` field values in bubble data */
const LEGEND_PALETTE: Record<string, string> = {
  Healthy: HEALTH_HEX.Healthy,
  Warning: HEALTH_HEX.Warning,
  Critical: HEALTH_HEX.Critical,
  Unknown: HEALTH_HEX.Unknown,
};

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

  /* Drill-down handler */
  const handleDrill = useCallback(
    (id: string) => { onRegionClick?.(id); },
    [onRegionClick],
  );

  const resolvedViewState = viewState ?? defaultCenter;

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
        width: '100%',
      }}
    >
      <MapView height={height} initialViewState={resolvedViewState}>
        {bubbleData.length > 0 && (
          <BubbleLayer
            data={bubbleData}
            color="legend"
            valueAccessor="health"
            scale="none"
            radius={(item: ClusterBubble) => {
              const minR = mini ? 8 : 14;
              const maxR = mini ? 28 : 50;
              return Math.max(minR, Math.min(maxR, Math.sqrt(item.entityCount) * (mini ? 4 : 6)));
            }}
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
                      <span style={{ color: HEALTH_HEX.Healthy }}>● {hs.healthy} ok</span>
                      <span style={{ color: HEALTH_HEX.Warning }}>● {hs.warning} warn</span>
                      <span style={{ color: HEALTH_HEX.Critical }}>● {hs.critical} crit</span>
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
                        <div style={{ width: `${(hs.healthy / total) * 100}%`, background: HEALTH_HEX.Healthy }} />
                        <div style={{ width: `${(hs.warning / total) * 100}%`, background: HEALTH_HEX.Warning }} />
                        <div style={{ width: `${(hs.critical / total) * 100}%`, background: HEALTH_HEX.Critical }} />
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
                        color: d.alertCount > 3 ? HEALTH_HEX.Warning : undefined,
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

        {!mini && !hideLegend && (
          <CategoricalLegend colorPalette={LEGEND_PALETTE} position="bottom" />
        )}
      </MapView>
    </div>
  );
};
