import React, { useMemo } from 'react';
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
import { TopologyMap } from '../components/TopologyMap';
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_KPI, DEMO_CHART_DATA } from '../data/demoData';
import type { ThresholdRule } from '../types/network';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';

/* ── Evaluate threshold → severity ─────────────────── */
function computeSeverity(
  value: number,
  thresholds: ThresholdRule[],
): 'critical' | 'warning' | 'healthy' {
  for (const t of thresholds) {
    const v = Number(t.value);
    const match =
      (t.comparator === '==' && value === v) ||
      (t.comparator === '<' && value < v) ||
      (t.comparator === '<=' && value <= v) ||
      (t.comparator === '>' && value > v) ||
      (t.comparator === '>=' && value >= v);
    if (match) {
      return t.color === 'red'
        ? 'critical'
        : t.color === 'amber'
          ? 'warning'
          : 'healthy';
    }
  }
  return 'healthy';
}

/* ── Pulse keyframe for critical ──────────────────── */
const pulseKeyframes = `
@keyframes nocPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220,23,42,0.0); }
  50%      { box-shadow: 0 0 12px 2px rgba(220,23,42,0.25); }
}
`;

export const Home = () => {
  const { demoMode } = useDemoMode();
  const globalCategory = NETWORK_CATEGORIES.find((c) => c.id === 'global')!;
  const allCategories = NETWORK_CATEGORIES;
  const specificCategories = NETWORK_CATEGORIES.filter((c) => c.id !== 'global');

  /* ── Status bar data ──── */
  const categoryStatusItems: StatusCategory[] = specificCategories.map((cat) => {
    const count = demoMode ? (DEMO_KPI[cat.id]?.[cat.kpi.fieldName] ?? 0) : 0;
    return {
      icon: cat.icon,
      label: cat.title,
      count,
      severity: computeSeverity(count, cat.kpi.thresholds),
    };
  });

  const totalAlerts = demoMode ? (DEMO_KPI['global']?.totalProblems ?? 0) : 0;
  const criticalCount = categoryStatusItems.filter((c) => c.severity === 'critical').length;
  const warningCount = categoryStatusItems.filter((c) => c.severity === 'warning').length;
  const healthyCount = categoryStatusItems.filter((c) => c.severity === 'healthy').length;

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

      <Flex flexDirection="column" padding={24} gap={20}>
        {/* ── NOC Header ──────────────────── */}
        <Flex alignItems="center" justifyContent="space-between">
          <Flex alignItems="center" gap={12}>
            <Heading level={3} style={{ margin: 0 }}>
              🌐 NOC — Network Observability Console
            </Heading>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.5px',
                background: demoMode
                  ? 'rgba(99, 102, 241, 0.15)'
                  : 'rgba(42, 176, 111, 0.15)',
                color: demoMode ? '#818cf8' : '#2ab06f',
              }}
            >
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
        <Flex gap={16} alignItems="stretch">
          {/* Mini topology */}
          <Flex
            flexDirection="column"
            style={{ flex: 1, minWidth: 0 }}
          >
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
                <Heading level={5} style={{ margin: 0 }}>Network Topology</Heading>
              </Flex>
              <a
                href="/ui/apps/my.network.observability.console/topology"
                style={{ fontSize: 11, color: '#73b1ff', textDecoration: 'none' }}
              >
                View full map →
              </a>
            </Flex>
            <TopologyMap height={260} mini />
          </Flex>

          {/* Trend chart */}
          <Flex
            flexDirection="column"
            style={{
              flex: 1,
              minWidth: 0,
              background: Colors.Background.Surface.Default,
              borderRadius: Borders.Radius.Container.Default,
              border: `1px solid ${Colors.Border.Neutral.Default}`,
              boxShadow: BoxShadows.Surface.Raised.Rest,
              overflow: 'hidden',
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
          </Flex>
        </Flex>

        {/* ── 5. Active Alerts ───────────── */}
        <AlertList />
      </Flex>
    </>
  );
};
