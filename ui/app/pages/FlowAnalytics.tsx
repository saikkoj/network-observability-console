import React, { useMemo } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { TimeseriesChart, DonutChart, CategoricalBarChart } from '@dynatrace/strato-components-preview/charts';
import { convertToTimeseries } from '@dynatrace/strato-components-preview/conversion-utilities';
import { useDql } from '@dynatrace-sdk/react-hooks';
import { NETWORK_QUERIES } from '../data/networkCategories';
import { useDemoMode } from '../hooks/useDemoMode';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';

/* ── Demo flow data ───────────────────────────────── */
const DEMO_FLOW_TIMESERIES = [
  {
    name: 'VPC Flow Traffic',
    datapoints: Array.from({ length: 24 }, (_, i) => ({
      start: new Date(Date.now() - (23 - i) * 600_000),
      value: Math.round(400 + Math.random() * 300),
    })),
  },
];

const DEMO_TOP_ENDPOINTS = [
  { category: '10.0.1.10', value: 12400 },
  { category: '10.0.2.20', value: 9800 },
  { category: '10.0.3.30', value: 7200 },
  { category: '172.16.0.5', value: 5100 },
  { category: '192.168.1.1', value: 3900 },
];

const DEMO_TOP_PORTS = [
  { category: '443 (HTTPS)', value: 48 },
  { category: '80 (HTTP)', value: 22 },
  { category: '22 (SSH)', value: 12 },
  { category: '3306 (MySQL)', value: 8 },
  { category: '53 (DNS)', value: 6 },
  { category: 'Other', value: 4 },
];

/* ── Chart card helper ─────────────────────────────── */
function ChartCard({
  icon,
  title,
  subtitle,
  children,
  height = 240,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number | string;
}) {
  return (
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
          <span style={{ fontSize: 14 }}>{icon}</span>
          <Heading level={5} style={{ margin: 0 }}>{title}</Heading>
        </Flex>
        {subtitle && (
          <Paragraph style={{ fontSize: 10, opacity: 0.5 }}>{subtitle}</Paragraph>
        )}
      </Flex>
      <div style={{ padding: '12px 16px', height }}>{children}</div>
    </Flex>
  );
}

/* ── Main page ─────────────────────────────────────── */
export const FlowAnalytics = () => {
  const { demoMode } = useDemoMode();

  /* ── Live DQL queries ── */
  const trafficResult = useDql(
    { query: NETWORK_QUERIES.vpcFlowTraffic },
    { enabled: !demoMode },
  );
  const endpointResult = useDql(
    { query: NETWORK_QUERIES.vpcTopEndpoints },
    { enabled: !demoMode },
  );
  const portResult = useDql(
    { query: NETWORK_QUERIES.vpcTopPorts },
    { enabled: !demoMode },
  );

  /* ── Chart data ── */
  const trafficTs = useMemo(() => {
    if (demoMode) return DEMO_FLOW_TIMESERIES;
    if (!trafficResult.data?.records || !trafficResult.data?.types) return null;
    try {
      return convertToTimeseries(trafficResult.data.records, trafficResult.data.types as any[]);
    } catch {
      return null;
    }
  }, [demoMode, trafficResult.data]);

  const topEndpoints = useMemo(() => {
    if (demoMode) return DEMO_TOP_ENDPOINTS;
    if (!endpointResult.data?.records) return null;
    return endpointResult.data.records.map((r: any) => ({
      category: String(r['src_ip'] ?? r[Object.keys(r)[0]] ?? '—'),
      value: Number(r['total_bytes'] ?? r[Object.keys(r)[1]] ?? 0),
    }));
  }, [demoMode, endpointResult.data]);

  const topPorts = useMemo(() => {
    if (demoMode) return DEMO_TOP_PORTS;
    if (!portResult.data?.records) return null;
    return portResult.data.records.map((r: any) => ({
      category: String(r['dst_port'] ?? r[Object.keys(r)[0]] ?? '—'),
      value: Number(r['total_bytes'] ?? r[Object.keys(r)[1]] ?? 0),
    }));
  }, [demoMode, portResult.data]);

  return (
    <Flex flexDirection="column" padding={24} gap={20}>
      {/* Header */}
      <Flex alignItems="center" justifyContent="space-between">
        <Flex alignItems="center" gap={12}>
          <Heading level={3} style={{ margin: 0 }}>☁️ Cloud Network Flow Analytics</Heading>
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
          AWS VPC / Transit Gateway flow analysis
        </Paragraph>
      </Flex>

      {/* Row 1: Traffic timeseries (full width) */}
      <ChartCard icon="📈" title="VPC Flow Traffic Over Time" subtitle="10-min bins" height={220}>
        {trafficTs ? (
          <TimeseriesChart data={trafficTs as any} />
        ) : (
          <Flex alignItems="center" justifyContent="center" style={{ height: '100%', opacity: 0.5 }}>
            <Paragraph>Loading…</Paragraph>
          </Flex>
        )}
      </ChartCard>

      {/* Row 2: Top Endpoints + Top Ports side by side */}
      <Flex gap={16} alignItems="stretch">
        <ChartCard icon="🎯" title="Top Talkers (Endpoints)" subtitle="by bytes" height={260}>
          {topEndpoints ? (
            <CategoricalBarChart data={topEndpoints as any} />
          ) : (
            <Flex alignItems="center" justifyContent="center" style={{ height: '100%', opacity: 0.5 }}>
              <Paragraph>Loading…</Paragraph>
            </Flex>
          )}
        </ChartCard>

        <ChartCard icon="🔢" title="Traffic by Port" subtitle="% distribution" height={260}>
          {topPorts ? (
            <DonutChart data={{ slices: topPorts } as any} />
          ) : (
            <Flex alignItems="center" justifyContent="center" style={{ height: '100%', opacity: 0.5 }}>
              <Paragraph>Loading…</Paragraph>
            </Flex>
          )}
        </ChartCard>
      </Flex>

      {/* Info panels */}
      <Flex gap={16}>
        {[
          { icon: '🔍', title: 'DQL Queries Used', items: ['fetch bizevents for VPC flow logs', 'Aggregation by src_ip, dst_port', 'Top-N ranking by total_bytes'] },
          { icon: '📦', title: 'Data Sources', items: ['AWS VPC Flow Logs (v3)', 'Transit Gateway Flow Logs', 'Ingested via Dynatrace Log Ingest'] },
          { icon: '⚙️', title: 'Configuration', items: ['Scope: storage:bizevents:read', 'Region: eu-west-1', 'Retention: 35 days'] },
        ].map(({ icon, title, items }) => (
          <Flex
            key={title}
            flexDirection="column"
            gap={8}
            style={{
              flex: 1,
              padding: '16px 20px',
              background: Colors.Background.Surface.Default,
              borderRadius: Borders.Radius.Container.Default,
              border: `1px solid ${Colors.Border.Neutral.Default}`,
            }}
          >
            <Flex alignItems="center" gap={8}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <Heading level={6} style={{ margin: 0 }}>{title}</Heading>
            </Flex>
            {items.map((item) => (
              <Paragraph key={item} style={{ fontSize: 12, margin: 0, opacity: 0.7 }}>
                • {item}
              </Paragraph>
            ))}
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
};
