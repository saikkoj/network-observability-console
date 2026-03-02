import React, { useState, useMemo } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import {
  TimeseriesChart,
  DonutChart,
  CategoricalBarChart,
} from '@dynatrace/strato-components-preview/charts';
import { convertToTimeseries } from '@dynatrace/strato-components-preview/conversion-utilities';
import {
  ToggleButtonGroup,
  ToggleButtonGroupItem,
} from '@dynatrace/strato-components-preview/buttons';
import { useDql } from '@dynatrace-sdk/react-hooks';
import { useDemoMode } from '../hooks/useDemoMode';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { modeBadgeStyle, toNum } from '../utils';

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */
const LOG_GROUP = '*flow-logs*';

/* ═══════════════════════════════════════════════════════
   Demo Data
   ═══════════════════════════════════════════════════════ */
const ts = (h: number) => new Date(Date.now() - (23 - h) * 3_600_000);

const DEMO_LOG_COUNT = 2_847_563;
const DEMO_HTTP_EGRESS = 142;
const DEMO_HTTP_INGRESS = 87;

const DEMO_VPC_TS = [
  { name: 'vpc-01a2b3c4d', datapoints: Array.from({ length: 24 }, (_, i) => ({ start: ts(i), value: Math.round(8e9 + Math.random() * 4e9) })) },
  { name: 'vpc-05e6f7g8h', datapoints: Array.from({ length: 24 }, (_, i) => ({ start: ts(i), value: Math.round(5e9 + Math.random() * 3e9) })) },
  { name: 'vpc-09i0j1k2l', datapoints: Array.from({ length: 24 }, (_, i) => ({ start: ts(i), value: Math.round(3e9 + Math.random() * 2e9) })) },
  { name: 'vpc-03m4n5o6p', datapoints: Array.from({ length: 24 }, (_, i) => ({ start: ts(i), value: Math.round(1.5e9 + Math.random() * 1e9) })) },
  { name: 'vpc-07q8r9s0t', datapoints: Array.from({ length: 24 }, (_, i) => ({ start: ts(i), value: Math.round(5e8 + Math.random() * 5e8) })) },
];

const DEMO_ENDPOINT_TS = [
  { name: '10.0.1.10 ⇄ 10.0.2.20', datapoints: Array.from({ length: 24 }, (_, i) => ({ start: ts(i), value: Math.round(2e9 + Math.random() * 1e9) })) },
  { name: '10.0.3.30 ⇄ 172.16.0.5', datapoints: Array.from({ length: 24 }, (_, i) => ({ start: ts(i), value: Math.round(1.5e9 + Math.random() * 8e8) })) },
  { name: '192.168.1.1 ⇄ 10.0.1.10', datapoints: Array.from({ length: 24 }, (_, i) => ({ start: ts(i), value: Math.round(1e9 + Math.random() * 5e8) })) },
  { name: '10.0.4.40 ⇄ 10.0.5.50', datapoints: Array.from({ length: 24 }, (_, i) => ({ start: ts(i), value: Math.round(5e8 + Math.random() * 3e8) })) },
  { name: '172.16.1.1 ⇄ 10.0.6.60', datapoints: Array.from({ length: 24 }, (_, i) => ({ start: ts(i), value: Math.round(2e8 + Math.random() * 1e8) })) },
];

const DEMO_ENDPOINT_PAIRS = [
  { category: '10.0.1.10 ⇄ 10.0.2.20', value: 48_200_000_000 },
  { category: '10.0.3.30 ⇄ 172.16.0.5', value: 36_100_000_000 },
  { category: '192.168.1.1 ⇄ 10.0.1.10', value: 24_500_000_000 },
  { category: '10.0.4.40 ⇄ 10.0.5.50', value: 12_300_000_000 },
  { category: '172.16.1.1 ⇄ 10.0.6.60', value: 4_800_000_000 },
  { category: '10.0.7.70 ⇄ 10.0.8.80', value: 3_200_000_000 },
  { category: '10.0.9.90 ⇄ 172.16.2.1', value: 2_100_000_000 },
  { category: '10.0.10.10 ⇄ 10.0.11.11', value: 1_500_000_000 },
  { category: '10.0.12.12 ⇄ 10.0.13.13', value: 900_000_000 },
  { category: '10.0.14.14 ⇄ 10.0.15.15', value: 400_000_000 },
];

const DEMO_SRC_PORTS = [
  { category: '443', value: 52_400_000_000 },
  { category: '80', value: 18_600_000_000 },
  { category: '22', value: 8_200_000_000 },
  { category: '3306', value: 4_100_000_000 },
  { category: '8443', value: 3_800_000_000 },
  { category: '5432', value: 2_200_000_000 },
  { category: '8080', value: 1_800_000_000 },
  { category: '6379', value: 1_100_000_000 },
  { category: '53', value: 900_000_000 },
  { category: '9200', value: 600_000_000 },
];

const DEMO_DST_PORTS = [
  { category: '443', value: 61_200_000_000 },
  { category: '80', value: 22_100_000_000 },
  { category: '3306', value: 9_400_000_000 },
  { category: '5432', value: 5_600_000_000 },
  { category: '6379', value: 3_200_000_000 },
  { category: '8080', value: 2_800_000_000 },
  { category: '22', value: 2_400_000_000 },
  { category: '9200', value: 1_500_000_000 },
  { category: '53', value: 1_200_000_000 },
  { category: '8443', value: 800_000_000 },
];

const DEMO_TRAFFIC_TYPES = [
  { category: 'Same VPC (1)', value: 62_000_000_000 },
  { category: 'Internet gateway (2)', value: 28_000_000_000 },
  { category: 'Virtual private gateway (3)', value: 8_500_000_000 },
  { category: 'Intra-region VPC peering (4)', value: 5_200_000_000 },
  { category: 'Inter-region VPC peering (5)', value: 2_100_000_000 },
  { category: 'Local gateway (6)', value: 800_000_000 },
  { category: 'Gateway VPC endpoint (7)', value: 400_000_000 },
  { category: 'Internet gateway Nitro (8)', value: 200_000_000 },
];

const DEMO_INTER_VPC = [
  { category: 'vpc-01a2b ⇄ vpc-05e6f', value: 18_400_000_000 },
  { category: 'vpc-01a2b ⇄ vpc-09i0j', value: 12_300_000_000 },
  { category: 'vpc-05e6f ⇄ vpc-03m4n', value: 8_600_000_000 },
  { category: 'vpc-09i0j ⇄ vpc-07q8r', value: 5_200_000_000 },
  { category: 'vpc-03m4n ⇄ vpc-07q8r', value: 2_800_000_000 },
];

/* ═══════════════════════════════════════════════════════
   Style helpers
   ═══════════════════════════════════════════════════════ */
const cardStyle: React.CSSProperties = {
  background: Colors.Background.Surface.Default,
  borderRadius: Borders.Radius.Container.Default,
  border: `1px solid ${Colors.Border.Neutral.Default}`,
  boxShadow: BoxShadows.Surface.Raised.Rest,
  overflow: 'hidden',
};

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */

/** KPI card for single-value metrics */
function KpiCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: string;
  label: string;
  value: number | string | null;
  loading?: boolean;
}) {
  return (
    <Flex
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={4}
      style={{ ...cardStyle, flex: 1, padding: '20px 16px', minWidth: 160 }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <Paragraph style={{ fontSize: 11, opacity: 0.6, textAlign: 'center', margin: 0 }}>
        {label}
      </Paragraph>
      <Heading level={3} style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
        {loading
          ? '…'
          : typeof value === 'number'
            ? value.toLocaleString()
            : value ?? '—'}
      </Heading>
    </Flex>
  );
}

/** Chart card wrapper with title bar */
function ChartCard({
  icon,
  title,
  subtitle,
  children,
  height = 260,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number | string;
}) {
  return (
    <Flex flexDirection="column" style={{ ...cardStyle, flex: 1, minWidth: 0 }}>
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
          <Paragraph style={{ fontSize: 10, opacity: 0.5, margin: 0 }}>{subtitle}</Paragraph>
        )}
      </Flex>
      <div style={{ padding: '12px 16px', height }}>{children}</div>
    </Flex>
  );
}

/** Section divider with heading */
function SectionHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <Flex alignItems="center" gap={8} style={{ paddingTop: 8 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <Heading level={4} style={{ margin: 0 }}>{title}</Heading>
      <div style={{ flex: 1, height: 1, background: Colors.Border.Neutral.Default }} />
    </Flex>
  );
}

/** Placeholder shown while a chart is loading */
function ChartLoading() {
  return (
    <Flex alignItems="center" justifyContent="center" style={{ height: '100%', opacity: 0.4 }}>
      <Paragraph>Loading…</Paragraph>
    </Flex>
  );
}

/* ═══════════════════════════════════════════════════════
   Main page component
   ═══════════════════════════════════════════════════════ */
export const FlowAnalytics = () => {
  const { demoMode } = useDemoMode();

  /* ── Filter state ── */
  const [direction, setDirection] = useState('egress');
  const [action, setAction] = useState('ACCEPT');

  /* ── Query builder helpers ──
   * logFilter — filter-only part (reused inside lookup sub-queries)
   * baseFilter — full "fetch logs" + filters prefix
   */
  const logFilter = useMemo(() => {
    const parts = [
      `| filter matchesValue(aws.log_group, "${LOG_GROUP}")`,
      `| filter action == "${action}"`,
    ];
    if (direction !== 'both') {
      parts.push(`| filter flow_direction == "${direction}"`);
    }
    parts.push(`| filter log_status == "OK"`);
    return parts.join('\n');
  }, [direction, action]);

  const baseFilter = useMemo(
    () => `fetch logs\n${logFilter}`,
    [logFilter],
  );

  /* ═══ 10 DQL queries (derived from real "Network analytics" dashboard) ═══ */

  /* 1. Total log count — no action/direction filter */
  const q1 = `fetch logs\n| filter matchesValue(aws.log_group, "${LOG_GROUP}")\n| summarize \`Log count\` = count(), by:{}`;

  /* 2. Outbound HTTP(S) endpoints (fixed egress direction) */
  const q2 = useMemo(
    () => `fetch logs\n| filter matchesValue(aws.log_group, "${LOG_GROUP}")\n| filter action == "${action}"\n| filter log_status == "OK" and flow_direction == "egress"\n| filter in(toLong(dstport), {80, 443})\n| summarize endpoints = countDistinct(pkt_dstaddr)`,
    [action],
  );

  /* 3. Inbound HTTP(S) clients (fixed ingress direction) */
  const q3 = useMemo(
    () => `fetch logs\n| filter matchesValue(aws.log_group, "${LOG_GROUP}")\n| filter action == "${action}"\n| filter log_status == "OK" and flow_direction == "ingress"\n| filter in(toLong(dstport), {80, 443})\n| summarize endpoints = countDistinct(pkt_srcaddr)`,
    [action],
  );

  /* 4. Top 5 origin VPC traffic over time */
  const q4 = useMemo(
    () => `${baseFilter}\n| makeTimeseries Traffic = sum(toLong(bytes)), by:{vpc_id}\n| fieldsRename \`Origin VPC\` = vpc_id\n| sort arraySum(Traffic) desc\n| limit 5`,
    [baseFilter],
  );

  /* 5. Top 5 endpoint pairs over time */
  const q5 = useMemo(
    () => `${baseFilter}\n| fieldsAdd flow = concat(pkt_srcaddr, " ⇄ ", pkt_dstaddr)\n| makeTimeseries Traffic = sum(toLong(bytes)), by:{\`Flow\` = flow}\n| sort arraySum(Traffic) desc\n| limit 5`,
    [baseFilter],
  );

  /* 6. Top 10 endpoint pairs (donut) */
  const q6 = useMemo(
    () => `${baseFilter}\n| fieldsAdd pair = if(pkt_srcaddr <= pkt_dstaddr, concat(pkt_srcaddr, " ⇄ ", pkt_dstaddr), else: concat(pkt_dstaddr, " ⇄ ", pkt_srcaddr))\n| summarize Traffic = sum(toLong(bytes)), by:{pair, vpc_id}\n| fieldsRename \`Endpoint pair\` = pair, \`Origin VPC\` = vpc_id\n| sort Traffic desc\n| limit 10`,
    [baseFilter],
  );

  /* 7. Top 10 source ports */
  const q7 = useMemo(
    () => `${baseFilter}\n| summarize {Traffic = sum(toLong(bytes)), Flows = count()}, by:{srcport}\n| fieldsRename \`Source Port\` = srcport\n| sort Traffic desc\n| limit 10`,
    [baseFilter],
  );

  /* 8. Top 10 destination ports */
  const q8 = useMemo(
    () => `${baseFilter}\n| summarize {Traffic = sum(toLong(bytes)), Flows = count()}, by:{dstport}\n| fieldsRename \`Destination Port\` = dstport\n| sort Traffic desc\n| limit 10`,
    [baseFilter],
  );

  /* 9. Traffic types by path (1 = Same VPC, 2 = IGW, …) */
  const q9 = useMemo(
    () => [
      baseFilter,
      `| fieldsAdd bytes = toLong(bytes)`,
      `| summarize {Traffic = sum(bytes)}, by:{traffic_path}`,
      `| fieldsAdd traffic_path = toString(traffic_path)`,
      `| fieldsAdd destination = coalesce(`,
      `  if(traffic_path == "1", "Same VPC"),`,
      `  if(traffic_path == "2", "Internet gateway"),`,
      `  if(traffic_path == "3", "Virtual private gateway"),`,
      `  if(traffic_path == "4", "Intra-region VPC peering"),`,
      `  if(traffic_path == "5", "Inter-region VPC peering"),`,
      `  if(traffic_path == "6", "Local gateway"),`,
      `  if(traffic_path == "7", "Gateway VPC endpoint"),`,
      `  if(traffic_path == "8", "Internet gateway Nitro"),`,
      `  "Unknown"`,
      `)`,
      `| fields Destination = concat(destination, " (", traffic_path, ")"), Traffic`,
      `| sort Traffic desc`,
    ].join('\n'),
    [baseFilter],
  );

  /* 10. Inter-VPC bidirectional traffic (self-join lookup) */
  const q10 = useMemo(
    () => [
      `fetch logs`,
      logFilter,
      `| fieldsAdd bytes = toLong(bytes), key = record(a = pkt_srcaddr, b = pkt_dstaddr)`,
      `| summarize {s_bytes = sum(bytes)}, by:{vpc_id, key}`,
      `| lookup [`,
      `  fetch logs`,
      `  ${logFilter}`,
      `  | fieldsAdd bytes = toLong(bytes), key = record(a = pkt_dstaddr, b = pkt_srcaddr)`,
      `  | summarize {r_bytes = sum(bytes)}, by:{vpc_id, key}`,
      `], sourceField:key, lookupField:key, fields:{dst_vpc = vpc_id, r_bytes}`,
      `| filter isNotNull(dst_vpc) and vpc_id != dst_vpc`,
      `| fieldsAdd bytesTotal = s_bytes + r_bytes`,
      `| fieldsAdd pair = if(vpc_id <= dst_vpc, concat(vpc_id, " ⇄ ", dst_vpc), else: concat(dst_vpc, " ⇄ ", vpc_id))`,
      `| summarize Traffic = sum(bytesTotal), by:{pair}`,
      `| sort Traffic desc`,
    ].join('\n'),
    [logFilter],
  );

  /* ═══ Execute queries ═══ */
  const r1 = useDql({ query: q1 }, { enabled: !demoMode });
  const r2 = useDql({ query: q2 }, { enabled: !demoMode });
  const r3 = useDql({ query: q3 }, { enabled: !demoMode });
  const r4 = useDql({ query: q4 }, { enabled: !demoMode });
  const r5 = useDql({ query: q5 }, { enabled: !demoMode });
  const r6 = useDql({ query: q6 }, { enabled: !demoMode });
  const r7 = useDql({ query: q7 }, { enabled: !demoMode });
  const r8 = useDql({ query: q8 }, { enabled: !demoMode });
  const r9 = useDql({ query: q9 }, { enabled: !demoMode });
  const r10 = useDql({ query: q10 }, { enabled: !demoMode });

  /* ═══ Data transformations ═══ */

  const logCount = useMemo(
    () => (demoMode ? DEMO_LOG_COUNT : toNum(r1.data?.records?.[0]?.['Log count'])),
    [demoMode, r1.data],
  );

  const httpEgress = useMemo(
    () => (demoMode ? DEMO_HTTP_EGRESS : toNum(r2.data?.records?.[0]?.endpoints)),
    [demoMode, r2.data],
  );

  const httpIngress = useMemo(
    () => (demoMode ? DEMO_HTTP_INGRESS : toNum(r3.data?.records?.[0]?.endpoints)),
    [demoMode, r3.data],
  );

  const vpcTs = useMemo(() => {
    if (demoMode) return DEMO_VPC_TS;
    if (!r4.data?.records || !r4.data?.types) return null;
    try { return convertToTimeseries(r4.data.records, r4.data.types as any[]); } catch { return null; }
  }, [demoMode, r4.data]);

  const endpointTs = useMemo(() => {
    if (demoMode) return DEMO_ENDPOINT_TS;
    if (!r5.data?.records || !r5.data?.types) return null;
    try { return convertToTimeseries(r5.data.records, r5.data.types as any[]); } catch { return null; }
  }, [demoMode, r5.data]);

  const endpointPairs = useMemo(() => {
    if (demoMode) return DEMO_ENDPOINT_PAIRS;
    if (!r6.data?.records) return null;
    return r6.data.records.map((r: any) => ({
      category: String(r['Endpoint pair'] ?? r.pair ?? '—'),
      value: toNum(r.Traffic),
    }));
  }, [demoMode, r6.data]);

  const srcPorts = useMemo(() => {
    if (demoMode) return DEMO_SRC_PORTS;
    if (!r7.data?.records) return null;
    return r7.data.records.map((r: any) => ({
      category: String(r['Source Port'] ?? r.srcport ?? '—'),
      value: toNum(r.Traffic),
    }));
  }, [demoMode, r7.data]);

  const dstPorts = useMemo(() => {
    if (demoMode) return DEMO_DST_PORTS;
    if (!r8.data?.records) return null;
    return r8.data.records.map((r: any) => ({
      category: String(r['Destination Port'] ?? r.dstport ?? '—'),
      value: toNum(r.Traffic),
    }));
  }, [demoMode, r8.data]);

  const trafficTypes = useMemo(() => {
    if (demoMode) return DEMO_TRAFFIC_TYPES;
    if (!r9.data?.records) return null;
    return r9.data.records.map((r: any) => ({
      category: String(r.Destination ?? '—'),
      value: toNum(r.Traffic),
    }));
  }, [demoMode, r9.data]);

  const interVpc = useMemo(() => {
    if (demoMode) return DEMO_INTER_VPC;
    if (!r10.data?.records) return null;
    return r10.data.records.map((r: any) => ({
      category: String(r.pair ?? '—'),
      value: toNum(r.Traffic),
    }));
  }, [demoMode, r10.data]);

  /* ═══ Render ═══ */
  return (
    <Flex flexDirection="column" padding={24} gap={20} style={{ contain: 'layout style' }}>

      {/* ── Header + filter controls ── */}
      <Flex alignItems="center" justifyContent="space-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <Flex alignItems="center" gap={12}>
          <Heading level={3} style={{ margin: 0 }}>☁️ AWS Network Flow Analytics</Heading>
          <span style={modeBadgeStyle(demoMode)}>{demoMode ? 'DEMO' : 'LIVE'}</span>
        </Flex>
        <Flex alignItems="center" gap={16} style={{ flexWrap: 'wrap' }}>
          <Flex alignItems="center" gap={6}>
            <Paragraph style={{ fontSize: 11, opacity: 0.6, margin: 0, whiteSpace: 'nowrap' }}>
              Direction:
            </Paragraph>
            <ToggleButtonGroup
              value={direction}
              onChange={(val: string) => setDirection(val)}
            >
              <ToggleButtonGroupItem value="egress">Egress</ToggleButtonGroupItem>
              <ToggleButtonGroupItem value="ingress">Ingress</ToggleButtonGroupItem>
              <ToggleButtonGroupItem value="both">Both</ToggleButtonGroupItem>
            </ToggleButtonGroup>
          </Flex>
          <Flex alignItems="center" gap={6}>
            <Paragraph style={{ fontSize: 11, opacity: 0.6, margin: 0, whiteSpace: 'nowrap' }}>
              Action:
            </Paragraph>
            <ToggleButtonGroup
              value={action}
              onChange={(val: string) => setAction(val)}
            >
              <ToggleButtonGroupItem value="ACCEPT">Accept</ToggleButtonGroupItem>
              <ToggleButtonGroupItem value="REJECT">Reject</ToggleButtonGroupItem>
            </ToggleButtonGroup>
          </Flex>
          <Paragraph style={{ fontSize: 10, opacity: 0.35, margin: 0, fontFamily: 'monospace' }}>
            aws.log_group: {LOG_GROUP}
          </Paragraph>
        </Flex>
      </Flex>

      {/* ── KPI strip ── */}
      <Flex gap={16} style={{ flexWrap: 'wrap' }}>
        <KpiCard icon="📋" label="Total Flow Logs" value={logCount} loading={!demoMode && r1.isLoading} />
        <KpiCard icon="🔼" label="HTTP(S) Egress Endpoints" value={httpEgress} loading={!demoMode && r2.isLoading} />
        <KpiCard icon="🔽" label="HTTP(S) Ingress Clients" value={httpIngress} loading={!demoMode && r3.isLoading} />
      </Flex>

      {/* ── Section: VPC Network Conversations ── */}
      <SectionHeading icon="🌐" title="VPC Network Conversations" />

      <ChartCard icon="📈" title="Top 5 Origin VPC Traffic" subtitle="over time" height={240}>
        {vpcTs ? <TimeseriesChart data={vpcTs as any} /> : <ChartLoading />}
      </ChartCard>

      <ChartCard icon="📊" title="Top 5 Endpoint Pairs" subtitle="over time" height={240}>
        {endpointTs ? <TimeseriesChart data={endpointTs as any} /> : <ChartLoading />}
      </ChartCard>

      <Flex gap={16} alignItems="stretch">
        <ChartCard icon="🔗" title="Top Endpoint Pairs" subtitle="by traffic volume">
          {endpointPairs ? (
            <DonutChart data={{ slices: endpointPairs } as any} />
          ) : (
            <ChartLoading />
          )}
        </ChartCard>
        <ChartCard icon="🔀" title="Inter-VPC Traffic" subtitle="bidirectional">
          {interVpc ? (
            <DonutChart data={{ slices: interVpc } as any} />
          ) : (
            <ChartLoading />
          )}
        </ChartCard>
      </Flex>

      {/* ── Section: Source & Destination Ports ── */}
      <SectionHeading icon="🔢" title="Source & Destination Ports" />

      <Flex gap={16} alignItems="stretch">
        <ChartCard icon="📤" title="Top Source Ports" subtitle="by bytes">
          {srcPorts ? (
            <DonutChart data={{ slices: srcPorts } as any} />
          ) : (
            <ChartLoading />
          )}
        </ChartCard>
        <ChartCard icon="📥" title="Top Destination Ports" subtitle="by bytes">
          {dstPorts ? (
            <DonutChart data={{ slices: dstPorts } as any} />
          ) : (
            <ChartLoading />
          )}
        </ChartCard>
      </Flex>

      {/* ── Section: Traffic Analysis ── */}
      <SectionHeading icon="🛤️" title="Traffic Analysis" />

      <ChartCard icon="🗺️" title="Traffic Types" subtitle="by network path" height={300}>
        {trafficTypes ? (
          <CategoricalBarChart data={trafficTypes as any} />
        ) : (
          <ChartLoading />
        )}
      </ChartCard>

      {/* ── Info panels ── */}
      <Flex gap={16}>
        {[
          {
            icon: '🔍',
            title: 'DQL Queries',
            items: [
              'fetch logs — AWS VPC Flow Logs',
              `matchesValue(aws.log_group, "${LOG_GROUP}")`,
              'makeTimeseries for time-series charts',
              'lookup self-join for bidirectional traffic',
            ],
          },
          {
            icon: '📦',
            title: 'Data Sources',
            items: [
              'AWS VPC Flow Logs (v3+)',
              'Transit Gateway Flow Logs',
              'Ingested via Dynatrace AWS Log Forwarder',
              'Fields pre-parsed: action, bytes, vpc_id, …',
            ],
          },
          {
            icon: '⚙️',
            title: 'Available Fields',
            items: [
              'action, flow_direction, log_status',
              'pkt_srcaddr, pkt_dstaddr, srcport, dstport',
              'vpc_id, tgw_id, az_id, traffic_path',
              'bytes, packets, aws.region',
            ],
          },
        ].map(({ icon, title, items }) => (
          <Flex
            key={title}
            flexDirection="column"
            gap={8}
            style={{ flex: 1, padding: '16px 20px', ...cardStyle }}
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
