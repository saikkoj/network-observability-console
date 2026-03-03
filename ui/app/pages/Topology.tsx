import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { Link } from '@dynatrace/strato-components/typography';
import { Tabs, Tab } from '@dynatrace/strato-components-preview/navigation';
import { HoneycombChart } from '@dynatrace/strato-components-preview/charts';
import { ClusterMap, FINLAND_CENTER } from '../components/ClusterMap';
import type { MapViewState } from '../components/ClusterMap';
import { TopologyMap } from '../components/TopologyMap';
import { useDemoMode } from '../hooks/useDemoMode';
import { useClusterData } from '../hooks/useClusterData';
import type { RegionDevice } from '../hooks/useClusterData';
import { useTopologyData } from '../hooks/useTopologyData';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { modeBadgeStyle, getDeviceUrl, openDeviceDetail, entityLinkStyle } from '../utils';
import type { DrillDownLevel, TopologySite, TopologyNode, HealthSummary, DeviceRole } from '../types/network';
import {
  SmartscapeIcon,
  DataCenterIcon,
  OfficeFilledIcon,
  NetworkDevicesIcon,
  NetworkIcon,
  ConnectorIcon,
  LocationMarkerIcon,
  WorldmapIcon,
  NodeIcon,
  SecurityIcon,
  HostsIcon,
  DesktopIcon,
} from '@dynatrace/strato-icons';

/* ── Site type icons (Strato components) ── */
const SITE_ICON_COMPONENT: Record<string, React.ComponentType> = {
  'data-center': DataCenterIcon,
  office: OfficeFilledIcon,
  pop: NetworkDevicesIcon,
  'cell-tower': NetworkIcon,
  exchange: ConnectorIcon,
};
const DEFAULT_SITE_ICON = LocationMarkerIcon;

/* ── Device role icon components for GenericGrid ── */
const ROLE_ICON_COMPONENT: Record<DeviceRole, React.ComponentType> = {
  router: NetworkDevicesIcon,
  'cloud-gw': ConnectorIcon,
  firewall: SecurityIcon,
  switch: NodeIcon,
  server: HostsIcon,
  cloud: ConnectorIcon,
  unknown: DesktopIcon,
};

/* ── Health bar ── */
function HealthBar({ hs, height = 6 }: { hs: HealthSummary; height?: number }) {
  const total = hs.healthy + hs.warning + hs.critical + hs.unknown;
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${(hs.healthy / total) * 100}%`, background: '#2ab06f' }} />
      <div style={{ width: `${(hs.warning / total) * 100}%`, background: '#fd8232' }} />
      <div style={{ width: `${(hs.critical / total) * 100}%`, background: '#dc172a' }} />
    </div>
  );
}

/* ── Worst health colour ── */
function worstHealth(hs: HealthSummary): string {
  if (hs.critical > 0) return '#dc172a';
  if (hs.warning > 0) return '#fd8232';
  return '#2ab06f';
}

/* ── Overlay panel wrapper — floats on top of the map ── */
function OverlayPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 64,
        left: 16,
        right: 16,
        bottom: 16,
        overflowY: 'auto',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>{children}</div>
    </div>
  );
}

export const Topology = () => {
  const { demoMode } = useDemoMode();
  const location = useLocation();
  const { regions, totalEntities, getSitesForRegion, getDevicesForRegion, getSiteTopology, getRegion } = useClusterData();

  /* drill-down state */
  const [level, setLevel] = useState<DrillDownLevel>('country');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);

  /* Auto-drill into a region if navigated from mini-map */
  useEffect(() => {
    const navState = location.state as { regionId?: string } | null;
    if (navState?.regionId && regions.length > 0) {
      const targetRegion = getRegion(navState.regionId);
      if (targetRegion) {
        setRegionId(navState.regionId);
        setSiteId(null);
        setLevel('region');
      }
      window.history.replaceState({}, '');
    }
  }, [location.state, regions, getRegion]);

  /* live topology for non-drill-down fallback */
  const liveTopology = useTopologyData(960, 600);

  /* current region & sites */
  const currentRegion = regionId ? getRegion(regionId) : undefined;
  const currentSites = useMemo(() => regionId ? getSitesForRegion(regionId) : [], [regionId, getSitesForRegion]);
  const currentSite = useMemo(() => currentSites.find(s => s.id === siteId), [currentSites, siteId]);

  /* devices in the current region (for live-mode drill-down) */
  const regionDevices = useMemo(() => regionId ? getDevicesForRegion(regionId) : [], [regionId, getDevicesForRegion]);

  /* site-level topology (generated on demand) */
  const siteTopology = useMemo(() => {
    if (!currentSite) return null;
    return getSiteTopology(currentSite);
  }, [currentSite, getSiteTopology]);

  /* navigation */
  const drillToRegion = useCallback((id: string) => { setRegionId(id); setSiteId(null); setLevel('region'); }, []);
  const drillToSite = useCallback((id: string) => { setSiteId(id); setLevel('site'); }, []);
  const goBack = useCallback(() => {
    if (level === 'site') { setSiteId(null); setLevel('region'); }
    else if (level === 'region') { setRegionId(null); setLevel('country'); }
  }, [level]);

  /* breadcrumb parts */
  const crumbs: Array<{ label: string; icon?: React.ComponentType; action?: () => void }> = [
    { label: 'All Regions', icon: WorldmapIcon, action: level !== 'country' ? () => { setLevel('country'); setRegionId(null); setSiteId(null); } : undefined },
  ];
  if (currentRegion) {
    crumbs.push({ label: currentRegion.label, action: level === 'site' ? () => { setLevel('region'); setSiteId(null); } : undefined });
  }
  if (currentSite) {
    crumbs.push({ label: currentSite.label });
  }

  /* ── Map viewState: auto-zoom based on drill-down level ── */
  const mapViewState = useMemo<MapViewState>(() => {
    if (level === 'region' && currentRegion) {
      return { latitude: currentRegion.lat, longitude: currentRegion.lon, zoom: 8 };
    }
    if (level === 'site' && currentRegion) {
      return { latitude: currentRegion.lat, longitude: currentRegion.lon, zoom: 10 };
    }
    /* Country level — show all Finland */
    if (regions.length === 0) return FINLAND_CENTER;
    const avgLat = regions.reduce((s, r) => s + r.lat, 0) / regions.length;
    const avgLon = regions.reduce((s, r) => s + r.lon, 0) / regions.length;
    return { latitude: avgLat, longitude: avgLon, zoom: 4.5 };
  }, [level, currentRegion, regions]);

  /* If not demo mode and at country level, show flat topology */
  const showFlatTopology = !demoMode && level === 'country';

  /* Stable numeric height for the map — viewport minus Page.Header (~56px).
     ResizeObserver was removed: it can micro-oscillate with strato-geo. */
  const [mapH, setMapH] = useState(() => typeof window !== 'undefined' ? window.innerHeight - 56 : 640);
  useEffect(() => {
    const onResize = () => setMapH(window.innerHeight - 56);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* Key changes on drill level → ClusterMap re-mounts with new initialViewState */
  const mapKey = `map-${level}-${regionId ?? 'all'}`;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minWidth: 0, height: mapH, width: '100%' }}>
      {/* ── PERSISTENT MAP BACKGROUND ── */}
      {demoMode && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <ClusterMap
            key={mapKey}
            regions={regions}
            onRegionClick={level === 'country' ? drillToRegion : undefined}
            height={mapH}
            viewState={mapViewState}
            hideLegend={level !== 'country'}
          />
        </div>
      )}

      {/* ── HEADER BAR (always visible, floating) ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: demoMode ? 'rgba(20,20,30,0.75)' : Colors.Background.Surface.Default,
          backdropFilter: demoMode ? 'blur(8px)' : undefined,
          borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
          minWidth: 0,
        }}
      >
        <Flex alignItems="center" gap={12} style={{ minWidth: 0 }}>
          <Flex alignItems="center" gap={8}>
            <SmartscapeIcon />
            <Heading level={3} style={{ margin: 0, whiteSpace: 'nowrap' }}>Network Topology</Heading>
          </Flex>
          <span style={modeBadgeStyle(demoMode)}>
            {demoMode ? 'DEMO' : 'LIVE'}
          </span>
          {demoMode && (
            <span style={{ fontSize: 12, color: '#73b1ff', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {totalEntities.toLocaleString()} entities
            </span>
          )}
        </Flex>

        {/* Breadcrumb */}
        <Flex alignItems="center" gap={4} style={{ fontSize: 12, minWidth: 0, flexShrink: 1 }}>
          {crumbs.map((c, i) => {
            const CrumbIcon = c.icon;
            return (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ opacity: 0.4, margin: '0 4px' }}>›</span>}
                {c.action ? (
                  <Link onClick={c.action} style={{ cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {CrumbIcon && <CrumbIcon />}{c.label}
                  </Link>
                ) : (
                  <span style={{ opacity: 0.7, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {CrumbIcon && <CrumbIcon />}{c.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </Flex>
      </div>

      {/* ── Flat topology for live mode ── */}
      {showFlatTopology && (
        <div style={{ position: 'relative', zIndex: 5, padding: 24 }}>
          <TopologyMap
            nodes={liveTopology.nodes}
            edges={liveTopology.edges}
            edgeCounts={liveTopology.edgeCounts}
            height={600}
            isLoading={liveTopology.isLoading}
            error={liveTopology.error}
          />
        </div>
      )}

      {/* ── COUNTRY LEVEL: map is the content, just show a subtle hint ── */}
      {level === 'country' && demoMode && (
        <OverlayPanel>
          <div style={{
            textAlign: 'center',
            marginTop: 24,
            padding: '12px 24px',
            background: 'rgba(20,20,30,0.65)',
            borderRadius: Borders.Radius.Container.Default,
            backdropFilter: 'blur(6px)',
            display: 'inline-block',
          }}>
            <Paragraph style={{ fontSize: 13, opacity: 0.8, margin: 0 }}>
              Click a region bubble to drill down
            </Paragraph>
          </div>
        </OverlayPanel>
      )}

      {/* ── REGION LEVEL: site grid overlay ── */}
      {level === 'region' && currentRegion && (
        <OverlayPanel>
          {/* Region summary card */}
          <Flex
            gap={24}
            alignItems="center"
            style={{
              padding: '14px 24px',
              background: 'rgba(20,20,30,0.85)',
              borderRadius: Borders.Radius.Container.Default,
              border: `1px solid ${Colors.Border.Neutral.Default}`,
              boxShadow: BoxShadows.Surface.Raised.Rest,
              backdropFilter: 'blur(8px)',
              marginBottom: 16,
              minWidth: 0,
              flexWrap: 'wrap',
            }}
          >
            <Button variant="default" onClick={goBack}>
              <span style={{ fontSize: 14 }}>←</span> Back
            </Button>
            <Flex flexDirection="column" gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Heading level={4} style={{ margin: 0 }}>{currentRegion.label}</Heading>
              <Paragraph style={{ fontSize: 11, opacity: 0.6 }}>
                {currentRegion.deviceCount.toLocaleString()} entities
                {currentSites.length > 0 && ` across ${currentSites.length} sites`}
              </Paragraph>
            </Flex>
            <Flex gap={16} flexWrap="wrap">
              <Flex flexDirection="column" alignItems="center">
                <span style={{ fontSize: 18, fontWeight: 700, color: '#73b1ff' }}>{currentRegion.avgCpu ?? 0}%</span>
                <span style={{ fontSize: 9, opacity: 0.5 }}>Avg CPU</span>
              </Flex>
              <Flex flexDirection="column" alignItems="center">
                <span style={{ fontSize: 18, fontWeight: 700, color: '#73b1ff' }}>{currentRegion.avgMemory ?? 0}%</span>
                <span style={{ fontSize: 9, opacity: 0.5 }}>Avg Memory</span>
              </Flex>
              <Flex flexDirection="column" alignItems="center">
                <span style={{ fontSize: 18, fontWeight: 700, color: currentRegion.alertCount > 10 ? '#dc172a' : '#fd8232' }}>{currentRegion.alertCount}</span>
                <span style={{ fontSize: 9, opacity: 0.5 }}>Alerts</span>
              </Flex>
            </Flex>
            <div style={{ width: 120 }}>
              <HealthBar hs={currentRegion.healthSummary} height={8} />
            </div>
          </Flex>

          {/* Site cards grid (demo mode) or device cards (live mode) */}
          {currentSites.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {currentSites.map((site) => (
                <SiteCard key={site.id} site={site} onClick={() => drillToSite(site.id)} />
              ))}
            </div>
          ) : regionDevices.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {regionDevices.map((dev) => (
                <DeviceCard key={dev.entityId} device={dev} />
              ))}
            </div>
          ) : (
            <Flex
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              gap={8}
              style={{
                padding: 48,
                background: 'rgba(20,20,30,0.75)',
                borderRadius: Borders.Radius.Container.Default,
                border: `1px solid ${Colors.Border.Neutral.Default}`,
                backdropFilter: 'blur(6px)',
              }}
            >
              <Paragraph style={{ fontSize: 14 }}>
                No devices found for this region.
              </Paragraph>
              <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>
                Device locations are derived from device name prefixes (e.g., LON-Router-01 → London).
              </Paragraph>
            </Flex>
          )}
        </OverlayPanel>
      )}

      {/* ── SITE LEVEL: Device topology + Generic overlay ── */}
      {level === 'site' && currentSite && siteTopology && (
        <OverlayPanel>
          {/* Site header */}
          <Flex
            gap={24}
            alignItems="center"
            style={{
              padding: '14px 24px',
              background: 'rgba(20,20,30,0.85)',
              borderRadius: Borders.Radius.Container.Default,
              border: `1px solid ${Colors.Border.Neutral.Default}`,
              boxShadow: BoxShadows.Surface.Raised.Rest,
              backdropFilter: 'blur(8px)',
              marginBottom: 16,
              minWidth: 0,
              flexWrap: 'wrap',
            }}
          >
            <Button variant="default" onClick={goBack}>
              <span style={{ fontSize: 14 }}>←</span> Back
            </Button>
            <Flex flexDirection="column" gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Flex alignItems="center" gap={8}>
                {(() => { const SI = SITE_ICON_COMPONENT[currentSite.siteType] ?? DEFAULT_SITE_ICON; return <SI />; })()}
                <Heading level={4} style={{ margin: 0 }}>{currentSite.label}</Heading>
              </Flex>
              <Paragraph style={{ fontSize: 11, opacity: 0.6 }}>
                {currentSite.deviceCount.toLocaleString()} entities • Showing top {Math.min(currentSite.deviceCount, 80)} in topology
              </Paragraph>
            </Flex>
            <Flex gap={16}>
              <Flex flexDirection="column" alignItems="center">
                <span style={{ fontSize: 18, fontWeight: 700, color: '#73b1ff' }}>{currentSite.avgCpu ?? 0}%</span>
                <span style={{ fontSize: 9, opacity: 0.5 }}>CPU</span>
              </Flex>
              <Flex flexDirection="column" alignItems="center">
                <span style={{ fontSize: 18, fontWeight: 700, color: '#73b1ff' }}>{currentSite.avgMemory ?? 0}%</span>
                <span style={{ fontSize: 9, opacity: 0.5 }}>Memory</span>
              </Flex>
            </Flex>
            <div style={{ width: 100 }}>
              <HealthBar hs={currentSite.healthSummary} height={8} />
            </div>
          </Flex>

          {/* Tabbed views: Generic (HoneycombChart) + Topology Graph */}
          <div
            style={{
              background: 'rgba(20,20,30,0.85)',
              borderRadius: Borders.Radius.Container.Default,
              border: `1px solid ${Colors.Border.Neutral.Default}`,
              boxShadow: BoxShadows.Surface.Raised.Rest,
              backdropFilter: 'blur(8px)',
              overflow: 'hidden',
            }}
          >
            <Tabs defaultIndex={0}>
              <Tab title="Generic View">
                <div style={{ padding: 16 }}>
                  <GenericGrid nodes={siteTopology.nodes} />
                </div>
              </Tab>
              <Tab title="Topology Graph">
                <TopologyMap
                  nodes={siteTopology.nodes}
                  edges={siteTopology.edges}
                  height={540}
                />
              </Tab>
            </Tabs>
          </div>
        </OverlayPanel>
      )}
    </div>
  );
};

/* ── Generic Grid: HoneycombChart showing entity health ── */
const HEALTH_VALUE_MAP: Record<string, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
  unknown: 'Unknown',
};

const ROLE_LABEL: Record<DeviceRole, string> = {
  router: 'R',
  'cloud-gw': 'CG',
  firewall: 'FW',
  switch: 'SW',
  server: 'SV',
  cloud: 'CL',
  unknown: '?',
};

function GenericGrid({ nodes }: { nodes: TopologyNode[] }) {
  /* Build categorical data: value = health status, name = device label */
  const honeycombData = useMemo(
    () =>
      nodes.map((n) => ({
        value: HEALTH_VALUE_MAP[n.health] ?? 'Unknown',
        name: `[${ROLE_LABEL[n.role] ?? '?'}] ${n.label}`,
      })),
    [nodes],
  );

  if (nodes.length === 0) {
    return (
      <Flex alignItems="center" justifyContent="center" style={{ height: 300, opacity: 0.5 }}>
        <Paragraph>No entity data.</Paragraph>
      </Flex>
    );
  }

  return (
    <HoneycombChart
      data={honeycombData}
      height={480}
      shape="hexagon"
      showLabels
      colorScheme={{
        Healthy: '#2ab06f',
        Warning: '#fd8232',
        Critical: '#dc172a',
        Unknown: '#555555',
      }}
    >
      <HoneycombChart.Legend position="bottom" />
    </HoneycombChart>
  );
}

/* ── Site Card Component ── */
function SiteCard({ site, onClick }: { site: TopologySite; onClick: () => void }) {
  const borderColor = worstHealth(site.healthSummary);

  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(20,20,30,0.85)',
        borderRadius: Borders.Radius.Container.Default,
        border: `1px solid ${Colors.Border.Neutral.Default}`,
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: BoxShadows.Surface.Raised.Rest,
        backdropFilter: 'blur(6px)',
        padding: '16px 20px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease, transform 0.12s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = BoxShadows.Surface.Raised.Hover;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = BoxShadows.Surface.Raised.Rest;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <Flex justifyContent="space-between" alignItems="flex-start">
        <Flex alignItems="center" gap={8}>
          {(() => { const SI = SITE_ICON_COMPONENT[site.siteType] ?? DEFAULT_SITE_ICON; return <SI />; })()}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{site.label}</div>
            <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'capitalize' }}>
              {site.siteType.replace('-', ' ')}
            </div>
          </div>
        </Flex>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#73b1ff' }}>
            {site.deviceCount.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, opacity: 0.5 }}>entities</div>
        </div>
      </Flex>

      <div style={{ margin: '12px 0 8px' }}>
        <HealthBar hs={site.healthSummary} />
      </div>

      <Flex justifyContent="space-between" style={{ fontSize: 10, opacity: 0.6 }}>
        <span>CPU: {site.avgCpu ?? 0}%</span>
        <span>Mem: {site.avgMemory ?? 0}%</span>
        <span style={{ color: site.alertCount > 0 ? '#fd8232' : undefined }}>
          {site.alertCount} alert{site.alertCount !== 1 ? 's' : ''}
        </span>
      </Flex>
    </div>
  );
}

/* ── Device Card Component (for live-mode region drill-down) ── */
const HEALTH_COLOR: Record<string, string> = {
  healthy: '#2ab06f',
  warning: '#fd8232',
  critical: '#dc172a',
};

const ROLE_DISPLAY: Record<DeviceRole, string> = {
  router: 'Router',
  'cloud-gw': 'Cloud Gateway',
  firewall: 'Firewall',
  switch: 'Switch',
  server: 'Server',
  cloud: 'Cloud',
  unknown: 'Device',
};

function DeviceCard({ device }: { device: RegionDevice }) {
  const borderColor = HEALTH_COLOR[device.health] ?? '#555';
  const RoleIcon = ROLE_ICON_COMPONENT[device.role] ?? DesktopIcon;

  return (
    <a
      href={getDeviceUrl(device.entityId)}
      target="_blank"
      rel="noopener"
      onClick={(e) => { e.preventDefault(); openDeviceDetail(device.entityId); }}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: 'rgba(20,20,30,0.85)',
        borderRadius: Borders.Radius.Container.Default,
        border: `1px solid ${Colors.Border.Neutral.Default}`,
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: BoxShadows.Surface.Raised.Rest,
        backdropFilter: 'blur(6px)',
        padding: '16px 20px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease, transform 0.12s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = BoxShadows.Surface.Raised.Hover;
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = BoxShadows.Surface.Raised.Rest;
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
      }}
      title={`Open ${device.name} in Infra & Operations`}
    >
      <Flex justifyContent="space-between" alignItems="flex-start">
        <Flex alignItems="center" gap={8}>
          <RoleIcon />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#73b1ff' }}>
              {device.name}
            </div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>
              {ROLE_DISPLAY[device.role]}
            </div>
          </div>
        </Flex>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: borderColor,
              textTransform: 'uppercase',
            }}
          >
            {device.health}
          </div>
          {device.problems > 0 && (
            <div style={{ fontSize: 10, color: '#dc172a' }}>
              {device.problems} problem{device.problems !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </Flex>
    </a>
  );
}
