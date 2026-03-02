/**
 * useClusterData — provides hierarchical region/site data for the Finland map.
 *
 * In demo mode: returns pre-built DEMO_REGIONS / DEMO_SITES.
 * In live mode: would aggregate dt.entity.network:device by management_zone → region.
 *               (placeholder — returns empty until DQL queries are wired up)
 */
import { useMemo } from 'react';
import { useDemoMode } from './useDemoMode';
import { DEMO_REGIONS, DEMO_SITES, DEMO_TOTAL_ENTITIES, generateSiteTopology } from '../data/demoData';
import type { TopologyCluster, TopologySite, TopologyNode, TopologyEdge } from '../types/network';

/* Re-export for convenience */
export type { TopologyCluster, TopologySite };

export interface UseClusterDataResult {
  regions: TopologyCluster[];
  totalEntities: number;
  getSitesForRegion: (regionId: string) => TopologySite[];
  getSiteTopology: (site: TopologySite) => { nodes: TopologyNode[]; edges: TopologyEdge[] };
  getRegion: (regionId: string) => TopologyCluster | undefined;
  isLoading: boolean;
}

export function useClusterData(): UseClusterDataResult {
  const { demoMode } = useDemoMode();

  const regions = useMemo(() => {
    if (demoMode) return DEMO_REGIONS;
    // Live mode placeholder — would fetch from DQL
    return [];
  }, [demoMode]);

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
    getSiteTopology,
    getRegion,
    isLoading: false,
  };
}
