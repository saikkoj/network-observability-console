import React, { useState, useMemo, useCallback } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { Link } from '@dynatrace/strato-components/typography';
import { FinlandMap } from '../components/FinlandMap';
import { TopologyMap } from '../components/TopologyMap';
import { useDemoMode } from '../hooks/useDemoMode';
import { useClusterData } from '../hooks/useClusterData';
import { useTopologyData } from '../hooks/useTopologyData';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { modeBadgeStyle } from '../utils';
import type { DrillDownLevel, TopologySite, HealthSummary } from '../types/network';

/* ── Site type icons ── */
const SITE_ICON: Record<string, string> = {
  'data-center': '🏢', office: '🏬', pop: '📡', 'cell-tower': '📶', exchange: '🔄',
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

export const Topology = () => {
  const { demoMode } = useDemoMode();
  const { regions, totalEntities, getSitesForRegion, getSiteTopology, getRegion } = useClusterData();

  /* drill-down state */
  const [level, setLevel] = useState<DrillDownLevel>('country');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);

  /* live topology for non-drill-down fallback */
  const liveTopology = useTopologyData(960, 600);

  /* current region & sites */
  const currentRegion = regionId ? getRegion(regionId) : undefined;
  const currentSites = useMemo(() => regionId ? getSitesForRegion(regionId) : [], [regionId, getSitesForRegion]);
  const currentSite = useMemo(() => currentSites.find(s => s.id === siteId), [currentSites, siteId]);

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
  const crumbs: Array<{ label: string; action?: () => void }> = [
    { label: '🇫🇮 Finland', action: level !== 'country' ? () => { setLevel('country'); setRegionId(null); setSiteId(null); } : undefined },
  ];
  if (currentRegion) {
    crumbs.push({ label: currentRegion.label, action: level === 'site' ? () => { setLevel('region'); setSiteId(null); } : undefined });
  }
  if (currentSite) {
    crumbs.push({ label: currentSite.label });
  }

  /* ── If not demo mode and at country level, show flat topology as before ── */
  const showFlatTopology = !demoMode && level === 'country';

  return (
    <Flex flexDirection="column" padding={24} gap={20}>
      {/* ── Header ── */}
      <Flex alignItems="center" justifyContent="space-between">
        <Flex alignItems="center" gap={12}>
          <Heading level={3} style={{ margin: 0 }}>🗺️ Network Topology</Heading>
          <span style={modeBadgeStyle(demoMode)}>
            {demoMode ? 'DEMO' : 'LIVE'}
          </span>
          {demoMode && (
            <span style={{ fontSize: 12, color: '#73b1ff', fontWeight: 600 }}>
              {totalEntities.toLocaleString()} entities
            </span>
          )}
        </Flex>

        {/* Breadcrumb */}
        <Flex alignItems="center" gap={4} style={{ fontSize: 12 }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ opacity: 0.4, margin: '0 4px' }}>›</span>}
              {c.action ? (
                <Link onClick={c.action} style={{ cursor: 'pointer' }}>
                  {c.label}
                </Link>
              ) : (
                <span style={{ opacity: 0.7, fontWeight: 600 }}>{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </Flex>
      </Flex>

      {/* ── COUNTRY LEVEL: Finland map ── */}
      {level === 'country' && demoMode && (
        <FinlandMap
          regions={regions}
          onRegionClick={drillToRegion}
          height={640}
        />
      )}

      {/* ── Flat topology for live mode ── */}
      {showFlatTopology && (
        <TopologyMap
          nodes={liveTopology.nodes}
          edges={liveTopology.edges}
          edgeCounts={liveTopology.edgeCounts}
          height={600}
          isLoading={liveTopology.isLoading}
          error={liveTopology.error}
        />
      )}

      {/* ── REGION LEVEL: Site grid ── */}
      {level === 'region' && currentRegion && (
        <>
          {/* Region summary */}
          <Flex
            gap={24}
            alignItems="center"
            style={{
              padding: '14px 24px',
              background: Colors.Background.Surface.Default,
              borderRadius: Borders.Radius.Container.Default,
              border: `1px solid ${Colors.Border.Neutral.Default}`,
              boxShadow: BoxShadows.Surface.Raised.Rest,
            }}
          >
            <Button variant="default" onClick={goBack}>
              <span style={{ fontSize: 14 }}>←</span> Back
            </Button>
            <Flex flexDirection="column" gap={2} style={{ flex: 1 }}>
              <Heading level={4} style={{ margin: 0 }}>{currentRegion.label}</Heading>
              <Paragraph style={{ fontSize: 11, opacity: 0.6 }}>
                {currentRegion.deviceCount.toLocaleString()} entities
                {currentSites.length > 0 && ` across ${currentSites.length} sites`}
              </Paragraph>
            </Flex>
            <Flex gap={16}>
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

          {/* Site cards grid — or placeholder if no sites in demo data */}
          {currentSites.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {currentSites.map((site) => (
                <SiteCard key={site.id} site={site} onClick={() => drillToSite(site.id)} />
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
                background: Colors.Background.Surface.Default,
                borderRadius: Borders.Radius.Container.Default,
                border: `1px solid ${Colors.Border.Neutral.Default}`,
                opacity: 0.7,
              }}
            >
              <Paragraph style={{ fontSize: 14 }}>
                No site-level data available for this region.
              </Paragraph>
              <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>
                In live mode, sites are discovered automatically from management zones and entity relationships.
              </Paragraph>
            </Flex>
          )}
        </>
      )}

      {/* ── SITE LEVEL: Device topology ── */}
      {level === 'site' && currentSite && siteTopology && (
        <>
          {/* Site header */}
          <Flex
            gap={24}
            alignItems="center"
            style={{
              padding: '14px 24px',
              background: Colors.Background.Surface.Default,
              borderRadius: Borders.Radius.Container.Default,
              border: `1px solid ${Colors.Border.Neutral.Default}`,
              boxShadow: BoxShadows.Surface.Raised.Rest,
            }}
          >
            <Button variant="default" onClick={goBack}>
              <span style={{ fontSize: 14 }}>←</span> Back
            </Button>
            <Flex flexDirection="column" gap={2} style={{ flex: 1 }}>
              <Flex alignItems="center" gap={8}>
                <span style={{ fontSize: 16 }}>{SITE_ICON[currentSite.siteType] ?? '📍'}</span>
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

          <TopologyMap
            nodes={siteTopology.nodes}
            edges={siteTopology.edges}
            height={540}
          />
        </>
      )}
    </Flex>
  );
};

/* ── Site Card Component ── */
function SiteCard({ site, onClick }: { site: TopologySite; onClick: () => void }) {
  const borderColor = worstHealth(site.healthSummary);

  return (
    <div
      onClick={onClick}
      style={{
        background: Colors.Background.Surface.Default,
        borderRadius: Borders.Radius.Container.Default,
        border: `1px solid ${Colors.Border.Neutral.Default}`,
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: BoxShadows.Surface.Raised.Rest,
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
          <span style={{ fontSize: 18 }}>{SITE_ICON[site.siteType] ?? '📍'}</span>
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
