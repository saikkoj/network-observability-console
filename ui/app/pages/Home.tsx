import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { TimeseriesChart } from '@dynatrace/strato-components-preview/charts';
import { convertToTimeseries } from '@dynatrace/strato-components-preview/conversion-utilities';
import { useDql } from '@dynatrace-sdk/react-hooks';
import { NETWORK_CATEGORIES } from '../data/networkCategories';
import { NocStatusBar, type StatusCategory } from '../components/NocStatusBar';
import { KpiStrip } from '../components/KpiStrip';
import { NocActionBar } from '../components/NocActionBar';
import { AlertList } from '../components/AlertList';
import { ClusterMap } from '../components/ClusterMap';
import { useClusterData } from '../hooks/useClusterData';
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_KPI, DEMO_CHART_DATA } from '../data/demoData';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { computeSeverity, toNum, modeBadgeStyle } from '../utils';

/* ── Pulse keyframe for critical (GPU-accelerated outline) ──────────────────── */
const pulseKeyframes = `
@keyframes nocPulse {
  0%, 100% { outline-color: rgba(220,23,42,0.0); }
  50%      { outline-color: rgba(220,23,42,0.35); }
}
`;

export const Home = () => {
  const { demoMode } = useDemoMode();
  const globalCategory = NETWORK_CATEGORIES.find((c) => c.id === 'global')!;
  const allCategories = NETWORK_CATEGORIES;
  const specificCategories = NETWORK_CATEGORIES.filter((c) => c.id !== 'global');

  /* ── Status bar data: use live KPI results per category ──── */
  const reachResult = useDql(
    { query: specificCategories.find(c => c.id === 'reachability')?.kpi.dqlQuery ?? '' },
    { enabled: !demoMode },
  );
  const satResult = useDql(
    { query: specificCategories.find(c => c.id === 'saturation')?.kpi.dqlQuery ?? '' },
    { enabled: !demoMode },
  );
  const errResult = useDql(
    { query: specificCategories.find(c => c.id === 'errors')?.kpi.dqlQuery ?? '' },
    { enabled: !demoMode },
  );
  const traffResult = useDql(
    { query: specificCategories.find(c => c.id === 'traffic')?.kpi.dqlQuery ?? '' },
    { enabled: !demoMode },
  );
  const liveKpiResults: Record<string, ReturnType<typeof useDql>> = {
    reachability: reachResult,
    saturation: satResult,
    errors: errResult,
    traffic: traffResult,
  };

  const categoryStatusItems: StatusCategory[] = specificCategories.map((cat) => {
    const count = demoMode
      ? (DEMO_KPI[cat.id]?.[cat.kpi.fieldName] ?? 0)
      : toNum((liveKpiResults[cat.id]?.data?.records?.[0] as Record<string, unknown>)?.[cat.kpi.fieldName]);
    return {
      icon: cat.icon,
      label: cat.title,
      count,
      severity: computeSeverity(count, cat.kpi.thresholds),
    };
  });

  const globalResult = useDql(
    { query: globalCategory.kpi.dqlQuery },
    { enabled: !demoMode },
  );
  const totalAlerts = demoMode
    ? (DEMO_KPI['global']?.totalProblems ?? 0)
    : toNum((globalResult.data?.records?.[0] as Record<string, unknown>)?.totalProblems);
  const criticalCount = categoryStatusItems.filter((c) => c.severity === 'critical').length;
  const warningCount = categoryStatusItems.filter((c) => c.severity === 'warning').length;
  const healthyCount = categoryStatusItems.filter((c) => c.severity === 'healthy').length;

  /* ── Cluster data (map) ──── */
  const { regions, totalEntities } = useClusterData();
  const navigate = useNavigate();

  /* ── Global trend chart ──── */
  const chartResult = useDql(
    { query: globalCategory.chartQuery },
    { enabled: !demoMode },
  );

  const chartData = useMemo(() => {
    if (demoMode) return DEMO_CHART_DATA['global'];
    if (!chartResult.data?.records || !chartResult.data?.types) return null;
    try {
      return convertToTimeseries(
        chartResult.data.records,
        chartResult.data.types as any[],
      );
    } catch {
      return null;
    }
  }, [demoMode, chartResult.data]);

  const hasCritical = criticalCount > 0;

  return (
    <>
      <style>{pulseKeyframes}</style>

      <Flex flexDirection="column" padding={24} gap={20} style={{ overflow: 'hidden', scrollbarGutter: 'stable', minWidth: 0 }}>
        {/* ── NOC Header ──────────────────── */}
        <Flex alignItems="center" justifyContent="space-between">
          <Flex alignItems="center" gap={12}>
            <Heading level={3} style={{ margin: 0 }}>
              🌐 NOC — Network Observability Console
            </Heading>
            <span style={modeBadgeStyle(demoMode)}>
              {demoMode ? 'DEMO' : 'LIVE'}
            </span>
          </Flex>
          <Paragraph style={{ fontSize: 11, opacity: 0.5 }}>
            Real-time network ops — powered by Agentic AI
          </Paragraph>
        </Flex>

        {/* ── 1. Status Bar ──────────────── */}
        <div
          style={{
            animation: hasCritical ? 'nocPulse 2s ease-in-out infinite' : 'none',
            borderRadius: Borders.Radius.Container.Default,
            outline: hasCritical ? '2px solid rgba(220,23,42,0)' : 'none',
            outlineOffset: 2,
          }}
        >
          <NocStatusBar
            totalAlerts={totalAlerts}
            criticalCount={criticalCount}
            warningCount={warningCount}
            healthyCount={healthyCount}
            categories={categoryStatusItems}
          />
        </div>

        {/* ── 2. KPI Strip ─────────────────── */}
        <KpiStrip categories={allCategories} />

        {/* ── 3. NOC Action Bar ─────────────── */}
        <NocActionBar />

        {/* ── 4. Topology Mini-Map + Trend side-by-side ── */}
        <Flex gap={16} alignItems="stretch" style={{ minWidth: 0 }}>
          {/* Mini cluster map */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <Flex
              alignItems="center"
              justifyContent="space-between"
              style={{
                padding: '10px 20px',
                background: Colors.Background.Surface.Default,
                borderRadius: `${Borders.Radius.Container.Default} ${Borders.Radius.Container.Default} 0 0`,
                border: `1px solid ${Colors.Border.Neutral.Default}`,
                borderBottom: 'none',
              }}
            >
              <Flex alignItems="center" gap={8}>
                <span style={{ fontSize: 14 }}>🗺️</span>
                <Heading level={5} style={{ margin: 0 }}>Network Clusters</Heading>
              </Flex>
              <Link
                to="/topology"
                style={{ fontSize: 11, color: '#73b1ff', textDecoration: 'none' }}
              >
                {totalEntities > 0 ? `${totalEntities.toLocaleString()} entities` : 'View full map'} →
              </Link>
            </Flex>
            <ClusterMap
              regions={regions}
              height={260}
              mini
              onRegionClick={(regionId) => {
                console.log('[Home] ClusterMap onRegionClick', regionId);
                navigate('/topology', { state: { regionId } });
              }}
            />
          </div>

          {/* Trend chart */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              background: Colors.Background.Surface.Default,
              borderRadius: Borders.Radius.Container.Default,
              border: `1px solid ${Colors.Border.Neutral.Default}`,
              boxShadow: BoxShadows.Surface.Raised.Rest,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              contain: 'layout style',
            }}
          >
            <Flex
              alignItems="center"
              justifyContent="space-between"
              style={{
                padding: '10px 20px',
                borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
              }}
            >
              <Flex alignItems="center" gap={8}>
                <span style={{ fontSize: 14 }}>📊</span>
                <Heading level={5} style={{ margin: 0 }}>Problem Trend — 4 Hours</Heading>
              </Flex>
              <Paragraph style={{ fontSize: 10, opacity: 0.5 }}>
                10-min bins
              </Paragraph>
            </Flex>
            <div style={{ padding: '8px 16px', height: 220 }}>
              {chartData ? (
                <TimeseriesChart data={chartData as any} />
              ) : (
                <Flex alignItems="center" justifyContent="center" style={{ height: '100%', opacity: 0.5 }}>
                  <Paragraph>Loading trend data…</Paragraph>
                </Flex>
              )}
            </div>
          </div>
        </Flex>

        {/* ── 5. Active Alerts ───────────── */}
        <AlertList />
      </Flex>
    </>
  );
};
