/**
 * useClusterData — provides hierarchical region/site data for the cluster map.
 *
 * In demo mode: returns pre-built DEMO_REGIONS / DEMO_SITES (Finland demo data).
 * In live mode: fetches dt.entity.network:device, extracts city from device name
 *               prefix (e.g., LON-Juniper-T4000-Core-Router → London), then
 *               aggregates into TopologyCluster objects with lat/lon coordinates.
 *               Provides per-region device lists for drill-down.
 */
import { useMemo } from 'react';
import { useDql } from '@dynatrace-sdk/react-hooks';
import { useDemoMode } from './useDemoMode';
import { DEMO_REGIONS, DEMO_SITES, DEMO_TOTAL_ENTITIES, generateSiteTopology } from '../data/demoData';
import { mapLocationToCity, toNum } from '../utils';
import type { TopologyCluster, TopologySite, TopologyNode, TopologyEdge, HealthSummary, DeviceRole } from '../types/network';

/* Re-export for convenience */
export type { TopologyCluster, TopologySite };

/** A single device belonging to a region — used for region drill-down */
export interface RegionDevice {
  entityId: string;
  name: string;
  role: DeviceRole;
  problems: number;
  health: 'healthy' | 'warning' | 'critical';
}

/* ── Infer device role from name (same logic as useTopologyData) ── */
function inferRole(name: string): DeviceRole {
  const s = name.toLowerCase();
  if (s.includes('rtr') || s.includes('router')) return 'router';
  if (s.includes('sw') || s.includes('switch') || s.includes('catalyst')) return 'switch';
  if (s.includes('fw') || s.includes('firewall') || s.includes('palo') || s.includes('fortinet')) return 'firewall';
  if (s.includes('srv') || s.includes('server') || s.includes('host')) return 'server';
  if (s.includes('cloud') || s.includes('aws') || s.includes('azure') || s.includes('gcp')) return 'cloud';
  return 'router'; // default for network devices
}

/** City → geographic coordinates for map placement */
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'Helsinki':      { lat: 60.17, lon: 24.94 },
  'Espoo':         { lat: 60.21, lon: 24.66 },
  'Vantaa':        { lat: 60.29, lon: 25.04 },
  'Tampere':       { lat: 61.50, lon: 23.79 },
  'Oulu':          { lat: 65.01, lon: 25.47 },
  'Turku':         { lat: 60.45, lon: 22.27 },
  'Rovaniemi':     { lat: 66.50, lon: 25.72 },
  'Jyväskylä':    { lat: 62.24, lon: 25.75 },
  'Kuopio':        { lat: 62.89, lon: 27.68 },
  'London':        { lat: 51.51, lon: -0.13 },
  'Frankfurt':     { lat: 50.11, lon: 8.68 },
  'Amsterdam':     { lat: 52.37, lon: 4.90 },
  'Paris':         { lat: 48.86, lon: 2.35 },
  'Berlin':        { lat: 52.52, lon: 13.41 },
  'Munich':        { lat: 48.14, lon: 11.58 },
  'Stockholm':     { lat: 59.33, lon: 18.07 },
  'Dublin':        { lat: 53.35, lon: -6.26 },
  'New York':      { lat: 40.71, lon: -74.01 },
  'San Francisco': { lat: 37.77, lon: -122.42 },
  'Los Angeles':   { lat: 34.05, lon: -118.24 },
  'Virginia':      { lat: 38.90, lon: -77.44 },
  'Oregon':        { lat: 45.52, lon: -122.68 },
  'Singapore':     { lat: 1.35, lon: 103.82 },
  'Tokyo':         { lat: 35.68, lon: 139.69 },
  'Sydney':        { lat: -33.87, lon: 151.21 },
};

/** DQL to fetch device names, entity IDs, + problem counts for live clustering */
const Q_CLUSTER_DEVICES = `fetch \`dt.entity.network:device\`
| fieldsAdd deviceName = entity.name
| lookup [
  fetch dt.davis.problems
  | expand affected_entity_ids
  | filter startsWith(affected_entity_ids, "CUSTOM_DEVICE")
  | summarize problems=countDistinct(display_id), by:{affected_entity_ids}
], sourceField:id, lookupField:affected_entity_ids, prefix:"p."
| fieldsAdd problems = coalesce(p.problems, 0)
| fields id, deviceName, problems`;

export interface UseClusterDataResult {
  regions: TopologyCluster[];
  totalEntities: number;
  getSitesForRegion: (regionId: string) => TopologySite[];
  getDevicesForRegion: (regionId: string) => RegionDevice[];
  getSiteTopology: (site: TopologySite) => { nodes: TopologyNode[]; edges: TopologyEdge[] };
  getRegion: (regionId: string) => TopologyCluster | undefined;
  isLoading: boolean;
}

export function useClusterData(): UseClusterDataResult {
  const { demoMode } = useDemoMode();

  /* Live DQL — fetch device names + problems for clustering */
  const liveResult = useDql(
    { query: Q_CLUSTER_DEVICES },
    { enabled: !demoMode, refetchInterval: 60_000 },
  );

  /* Build regions and per-region device lists from live DQL data */
  const { regions, devicesByRegion } = useMemo(() => {
    if (demoMode) return { regions: DEMO_REGIONS, devicesByRegion: new Map<string, RegionDevice[]>() };

    const records = liveResult.data?.records;
    if (!records || records.length === 0) return { regions: [] as TopologyCluster[], devicesByRegion: new Map<string, RegionDevice[]>() };

    /* Group devices by city (derived from device name prefix) */
    const cityMap = new Map<string, { count: number; problems: number }>();
    const cityDevices = new Map<string, RegionDevice[]>();
    for (const r of records) {
      const rec = r as Record<string, unknown>;
      const name = String(rec['deviceName'] ?? '');
      const entityId = String(rec['id'] ?? '');
      const problems = toNum(rec['problems']);
      const city = mapLocationToCity(name);
      if (!city) continue; // skip unmapped devices
      const existing = cityMap.get(city) ?? { count: 0, problems: 0 };
      existing.count += 1;
      existing.problems += problems;
      cityMap.set(city, existing);

      /* Track individual device */
      const devList = cityDevices.get(city) ?? [];
      devList.push({
        entityId,
        name,
        role: inferRole(name),
        problems,
        health: problems > 0 ? 'critical' : 'healthy',
      });
      cityDevices.set(city, devList);
    }

    /* Convert to TopologyCluster[] */
    const clusters: TopologyCluster[] = [];
    const devByRegion = new Map<string, RegionDevice[]>();
    for (const [city, info] of cityMap) {
      const coords = CITY_COORDS[city];
      if (!coords) continue; // skip cities without known coordinates
      const health: HealthSummary = {
        healthy: Math.max(0, info.count - info.problems),
        warning: 0,
        critical: info.problems,
        unknown: 0,
      };
      const regionId = city.toLowerCase().replace(/\s+/g, '-');
      clusters.push({
        id: regionId,
        label: city,
        x: 0, y: 0,
        lat: coords.lat,
        lon: coords.lon,
        deviceCount: info.count,
        healthSummary: health,
        alertCount: info.problems,
      });
      devByRegion.set(regionId, cityDevices.get(city) ?? []);
    }

    return {
      regions: clusters.sort((a, b) => b.deviceCount - a.deviceCount),
      devicesByRegion: devByRegion,
    };
  }, [demoMode, liveResult.data]);

  const totalEntities = useMemo(() => {
    if (demoMode) return DEMO_TOTAL_ENTITIES;
    return regions.reduce((s, r) => s + r.deviceCount, 0);
  }, [demoMode, regions]);

  const getSitesForRegion = useMemo(() => {
    if (demoMode) {
      return (regionId: string) => DEMO_SITES[regionId] ?? [];
    }
    return (_regionId: string) => [] as TopologySite[];
  }, [demoMode]);

  const getDevicesForRegion = useMemo(() => {
    return (regionId: string) => devicesByRegion.get(regionId) ?? [];
  }, [devicesByRegion]);

  const getSiteTopology = useMemo(() => {
    return (site: TopologySite) => generateSiteTopology(site);
  }, []);

  const getRegion = useMemo(() => {
    const map = new Map(regions.map(r => [r.id, r]));
    return (id: string) => map.get(id);
  }, [regions]);

  return {
    regions,
    totalEntities,
    getSitesForRegion,
    getDevicesForRegion,
    getSiteTopology,
    getRegion,
    isLoading: !demoMode && liveResult.isLoading,
  };
}
