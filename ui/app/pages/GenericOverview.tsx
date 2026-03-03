/**
 * GenericOverview — Tab page showing queries from the "Generic network overview" dashboard.
 *
 * Includes: device groups count, device/interface counts, device/interface monitoring
 * honeycomb, CPU line chart, memory bar chart, busiest interfaces, and neighbors table.
 *
 * Supports:
 * - deviceFilter: string[] — when non-empty, DQL queries are filtered to those device names
 *   (equivalent to dashboard variable $devices)
 * - topLimit: number — controls how many items appear in "top N" charts/tables
 *
 * Dynatrace Segments are applied automatically by the platform via SegmentSelector on the
 * parent page. No additional wiring needed in DQL queries.
 */
import React, { useMemo, useCallback } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { IntentButton } from '@dynatrace/strato-components/buttons';
import { TimeseriesChart, CategoricalBarChart } from '@dynatrace/strato-components-preview/charts';
import { DataTable } from '@dynatrace/strato-components-preview/tables';
import { convertToTimeseries } from '@dynatrace/strato-components-preview/conversion-utilities';
import { useDql } from '@dynatrace-sdk/react-hooks';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { useDemoMode } from '../hooks/useDemoMode';
import { getDeviceUrl, openDeviceDetail, entityLinkStyle } from '../utils';

/* ─────────────────────────── helpers ─────────────────────────── */

/** Build a DQL `in(entity.name, array(...))` filter clause for fetch queries */
const deviceFilterClause = (names: string[]) => {
  if (names.length === 0) return '';
  const list = names.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ');
  return `| filter in(entity.name, array(${list}))`;
};

/** Build a DQL filter clause for timeseries by device entity name */
const tsDeviceFilterClause = (names: string[]) => {
  if (names.length === 0) return '';
  const list = names.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ');
  return `| filter in(entityName(\`dt.entity.network:device\`), array(${list}))`;
};

/* ─────────────────────────── Card wrapper ─────────────────────────── */
const Card = ({
  title,
  children,
  style,
  query,
}: {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  /** DQL query — when provided, shows "Open with…" button */
  query?: string;
}) => (
  <div
    style={{
      background: Colors.Background.Surface.Default,
      border: `1px solid ${Colors.Border.Neutral.Default}`,
      borderRadius: Borders.Radius.Container.Default,
      boxShadow: BoxShadows.Surface.Raised.Rest,
      padding: 16,
      ...style,
    }}
  >
    {title && (
      <Flex alignItems="center" justifyContent="space-between" style={{ marginBottom: 12 }}>
        <Heading level={6} style={{ margin: 0, opacity: 0.8 }}>
          {title}
        </Heading>
        {query && (
          <IntentButton payload={{ 'dt.query': query }} size="condensed">
            Open with
          </IntentButton>
        )}
      </Flex>
    )}
    {children}
  </div>
);

/* ── Loading / empty placeholder ── */
const LoadingPlaceholder = ({ message = 'Loading…' }: { message?: string }) => (
  <Flex alignItems="center" justifyContent="center" style={{ height: 120, opacity: 0.5 }}>
    <Paragraph>{message}</Paragraph>
  </Flex>
);

/* ─────────────────────────── Query builders ─────────────────────────── */

const buildDeviceCount = (df: string[]) =>
  `fetch \`dt.entity.network:device\`\n${deviceFilterClause(df)}\n| summarize count = count()`;

const buildDeviceGroups = (df: string[]) =>
  `fetch \`dt.entity.network:device\`\n${deviceFilterClause(df)}
| summarize groups=collectDistinct(child_of[\`dt.entity.network:device_group\`])
| fields count = arraySize(arrayRemoveNulls(groups))`;

const buildInterfaceCount = (df: string[]) => {
  if (df.length === 0) {
    return `fetch \`dt.entity.network:interface\`\n| summarize count = count()`;
  }
  const list = df.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ');
  return `fetch \`dt.entity.network:interface\`
| fieldsAdd deviceName = entityName(belongs_to[\`dt.entity.network:device\`])
| filter in(deviceName, array(${list}))
| summarize count = count()`;
};

const buildPortCount = () =>
  `fetch \`dt.entity.network:port\`\n| summarize count = count()`;

const buildDeviceMonitoring = (df: string[]) =>
  `fetch \`dt.entity.network:device\`\n${deviceFilterClause(df)}
| fields id, entity.name, monitoring = if(isNull(same_as), "Discovered", else: "Monitored")
| summarize Monitored = countIf(monitoring == "Monitored"), Discovered = countIf(monitoring == "Discovered")`;

const buildInterfaceMonitoring = (df: string[]) => {
  if (df.length === 0) {
    return `fetch \`dt.entity.network:interface\`
| fields id, entity.name, monitoring = if(isNull(same_as), "Discovered", else: "Monitored")
| summarize Monitored = countIf(monitoring == "Monitored"), Discovered = countIf(monitoring == "Discovered")`;
  }
  const list = df.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ');
  return `fetch \`dt.entity.network:interface\`
| fieldsAdd deviceName = entityName(belongs_to[\`dt.entity.network:device\`])
| filter in(deviceName, array(${list}))
| fields id, entity.name, monitoring = if(isNull(same_as), "Discovered", else: "Monitored")
| summarize Monitored = countIf(monitoring == "Monitored"), Discovered = countIf(monitoring == "Discovered")`;
};

const buildCpu = (df: string[], limit: number) =>
  `timeseries cpu=avg(com.dynatrace.extension.network_device.cpu_usage), 
  by: { \`dt.entity.network:device\` },
  filter: { isNotNull(\`dt.entity.network:device\`) }
| fieldsAdd name=entityName(\`dt.entity.network:device\`)
${tsDeviceFilterClause(df)}
| sort arrayAvg(cpu) desc
| limit ${limit}`;

const buildMemory = (df: string[], limit: number) =>
  `timeseries {
    m1=avg(com.dynatrace.extension.network_device.memory_used),
    m2=avg(com.dynatrace.extension.network_device.memory_free)
  },
  by: { \`dt.entity.network:device\` },
  filter: { isNotNull(\`dt.entity.network:device\`) }
| fields Used=arrayLast(m1), Free=arrayLast(m2), name=entityName(\`dt.entity.network:device\`)
${tsDeviceFilterClause(df)}
| sort Used desc
| limit ${limit}`;

const buildBusiestInterfaces = (df: string[], limit: number) =>
  `timeseries {
    \`Traffic in\`=avg(com.dynatrace.extension.network_device.if.bytes_in.count, scalar: true),
    \`Traffic out\`=avg(com.dynatrace.extension.network_device.if.bytes_out.count, scalar: true)
  },
  by: { \`dt.entity.network:device\`, \`dt.entity.network:interface\` },
  filter: { 
    isNotNull(\`dt.entity.network:device\`) and isNotNull(\`dt.entity.network:interface\`)
  }
| fieldsAdd name=entityName(\`dt.entity.network:interface\`)
${tsDeviceFilterClause(df)}
| sort \`Traffic in\` desc
| limit ${limit}`;

const buildNeighbors = (df: string[]) => {
  const nameFilter = df.length > 0
    ? `| filter in(Device, array(${df.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ')}))`
    : '';
  return `fetch logs
| filter log.source == "snmp_autodiscovery" and content == "Neighbor discovery"
| sort timestamp desc
| fieldsAdd srcDevice = lookup([fetch \`dt.entity.network:device\`], sourceField:\`dt.entity.network:device\`, lookupField:id)
| filter isNotNull(srcDevice)
| fields
    \`dt.entity.network:device\`,
    Device = srcDevice[entity.name],
    Port = monitored.mac,
    Interface = monitored.interface,
    neighbor.mac,
    neighbor.address,
    \`Neighbor Name\` = neighbor.sys.name,
    \`Neighbor Desc\` = neighbor.sys.desc
${nameFilter}
| dedup Device, Port, Interface, neighbor.mac, neighbor.address, \`Neighbor Name\`
| sort Device desc
| limit 100`;
};

/* ─────────────────────────── Stat card ─────────────────────────── */
const StatCard = ({ title, query }: { title: string; query: string }) => {
  const { demoMode } = useDemoMode();
  const { data, isLoading } = useDql({ query }, { enabled: !demoMode });
  const val = data?.records?.[0]?.['count'] as number | undefined;

  return (
    <Card style={{ flex: 1, minWidth: 100, textAlign: 'center' }}>
      <Paragraph style={{ fontSize: 10, fontWeight: 600, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
        {title}
      </Paragraph>
      <Heading level={2} style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
        {isLoading ? '…' : (val ?? (demoMode ? '—' : '0'))}
      </Heading>
    </Card>
  );
};

/* ─────────────────────────── Props ─────────────────────────── */
interface GenericOverviewProps {
  /** Selected device names from the parent FilterBar. Empty = show all. */
  deviceFilter?: string[];
  /** Max items in "top N" queries. Default 20. */
  topLimit?: number;
}

/* ─────────────────────────── Main component ─────────────────────────── */
export const GenericOverview = ({ deviceFilter = [], topLimit = 20 }: GenericOverviewProps) => {
  const { demoMode } = useDemoMode();
  const df = deviceFilter;
  const limit = topLimit;

  /* ── Build queries (memoized on filter changes) ── */
  const qDeviceCount = useMemo(() => buildDeviceCount(df), [df]);
  const qDeviceGroups = useMemo(() => buildDeviceGroups(df), [df]);
  const qInterfaceCount = useMemo(() => buildInterfaceCount(df), [df]);
  const qPortCount = useMemo(() => buildPortCount(), []);
  const qDeviceMonitoring = useMemo(() => buildDeviceMonitoring(df), [df]);
  const qInterfaceMonitoring = useMemo(() => buildInterfaceMonitoring(df), [df]);
  const qCpu = useMemo(() => buildCpu(df, limit), [df, limit]);
  const qMemory = useMemo(() => buildMemory(df, limit), [df, limit]);
  const qBusiestInterfaces = useMemo(() => buildBusiestInterfaces(df, limit), [df, limit]);
  const qNeighbors = useMemo(() => buildNeighbors(df), [df]);

  /* CPU timeseries */
  const cpuResult = useDql({ query: qCpu }, { enabled: !demoMode });
  const cpuData = useMemo(() => {
    if (!cpuResult.data?.records || !cpuResult.data?.types) return null;
    try { return convertToTimeseries(cpuResult.data.records, cpuResult.data.types as any[]); }
    catch { return null; }
  }, [cpuResult.data]);

  /* Busiest interfaces timeseries */
  const busiestResult = useDql({ query: qBusiestInterfaces }, { enabled: !demoMode });
  const busiestData = useMemo(() => {
    if (!busiestResult.data?.records || !busiestResult.data?.types) return null;
    try { return convertToTimeseries(busiestResult.data.records, busiestResult.data.types as any[]); }
    catch { return null; }
  }, [busiestResult.data]);

  /* Memory bar data */
  const memResult = useDql({ query: qMemory }, { enabled: !demoMode });

  /* Monitoring breakdown */
  const devMonResult = useDql({ query: qDeviceMonitoring }, { enabled: !demoMode });
  const ifcMonResult = useDql({ query: qInterfaceMonitoring }, { enabled: !demoMode });

  /* Neighbors table */
  const neighborsResult = useDql({ query: qNeighbors }, { enabled: !demoMode });

  const neighborColumns: any[] = useMemo(() => [
    {
      id: 'device',
      header: 'Device',
      accessor: 'Device',
      width: '1fr',
      resizable: true,
      cell: ({ value, rowData }: { value: string; rowData: Record<string, unknown> }) => {
        const entityId = rowData['dt.entity.network:device'] as string | undefined;
        if (entityId) {
          return (
            <a
              href={getDeviceUrl(entityId)}
              target="_blank"
              rel="noopener"
              style={entityLinkStyle}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); openDeviceDetail(entityId); }}
              title={`Open ${value} in Infra & Operations`}
            >
              {value}
            </a>
          );
        }
        return <span>{value}</span>;
      },
    },
    { id: 'port', header: 'Port', accessor: 'Port', width: '1fr', resizable: true },
    { id: 'interface', header: 'Interface', accessor: 'Interface', width: '1fr', resizable: true },
    { id: 'neighborName', header: 'Neighbor Name', accessor: 'Neighbor Name', width: '1fr', resizable: true },
    { id: 'neighborAddress', header: 'Neighbor Address', accessor: 'neighbor.address', width: '1fr', resizable: true },
    { id: 'neighborDesc', header: 'Neighbor Desc', accessor: 'Neighbor Desc', width: '1fr', resizable: true },
  ], []);

  const filterInfo = df.length > 0
    ? `Filtered to ${df.length} device${df.length > 1 ? 's' : ''} · Top ${limit}`
    : `All devices · Top ${limit}`;

  return (
    <Flex flexDirection="column" gap={16}>
      {/* Description */}
      <Paragraph style={{ opacity: 0.7, fontSize: 13 }}>
        Generic network overview — entity counts, monitoring status, CPU/memory performance, busiest interfaces, and network neighbors.
        <span style={{ opacity: 0.5, marginLeft: 8, fontSize: 11 }}>({filterInfo})</span>
      </Paragraph>

      {/* KPI counters row */}
      <Flex gap={12} flexWrap="wrap">
        <StatCard title="Devices" query={qDeviceCount} />
        <StatCard title="Device Groups" query={qDeviceGroups} />
        <StatCard title="Interfaces" query={qInterfaceCount} />
        <StatCard title="Ports" query={qPortCount} />
      </Flex>

      {/* Monitoring status */}
      <Flex gap={16}>
        <Card title="Device Monitoring" style={{ flex: 1 }} query={qDeviceMonitoring}>
          {devMonResult.isLoading ? (
            <LoadingPlaceholder />
          ) : devMonResult.data?.records?.[0] ? (
            <Flex gap={24} justifyContent="center">
              <Flex flexDirection="column" alignItems="center">
                <Heading level={3} style={{ margin: 0, color: '#2a7453' }}>
                  {String(devMonResult.data.records[0]['Monitored'] ?? 0)}
                </Heading>
                <Paragraph style={{ fontSize: 11, opacity: 0.6 }}>Monitored</Paragraph>
              </Flex>
              <Flex flexDirection="column" alignItems="center">
                <Heading level={3} style={{ margin: 0, color: '#627cfe' }}>
                  {String(devMonResult.data.records[0]['Discovered'] ?? 0)}
                </Heading>
                <Paragraph style={{ fontSize: 11, opacity: 0.6 }}>Discovered</Paragraph>
              </Flex>
            </Flex>
          ) : (
            <LoadingPlaceholder message={demoMode ? 'Demo mode — no live data' : 'No data'} />
          )}
        </Card>
        <Card title="Interface Monitoring" style={{ flex: 1 }} query={qInterfaceMonitoring}>
          {ifcMonResult.isLoading ? (
            <LoadingPlaceholder />
          ) : ifcMonResult.data?.records?.[0] ? (
            <Flex gap={24} justifyContent="center">
              <Flex flexDirection="column" alignItems="center">
                <Heading level={3} style={{ margin: 0, color: '#2a7453' }}>
                  {String(ifcMonResult.data.records[0]['Monitored'] ?? 0)}
                </Heading>
                <Paragraph style={{ fontSize: 11, opacity: 0.6 }}>Monitored</Paragraph>
              </Flex>
              <Flex flexDirection="column" alignItems="center">
                <Heading level={3} style={{ margin: 0, color: '#627cfe' }}>
                  {String(ifcMonResult.data.records[0]['Discovered'] ?? 0)}
                </Heading>
                <Paragraph style={{ fontSize: 11, opacity: 0.6 }}>Discovered</Paragraph>
              </Flex>
            </Flex>
          ) : (
            <LoadingPlaceholder message={demoMode ? 'Demo mode — no live data' : 'No data'} />
          )}
        </Card>
      </Flex>

      {/* CPU + Memory charts side by side */}
      <Flex gap={16}>
        <Card title={`CPU Usage (Top ${limit})`} style={{ flex: 1 }} query={qCpu}>
          {cpuData ? (
            <div style={{ height: 280 }}>
              <TimeseriesChart data={cpuData as any} />
            </div>
          ) : (
            <LoadingPlaceholder message={cpuResult.isLoading ? 'Loading…' : (demoMode ? 'Demo mode — no live data' : 'No CPU data')} />
          )}
        </Card>
        <Card title={`Memory Usage (Top ${limit})`} style={{ flex: 1 }} query={qMemory}>
          {memResult.data?.records && memResult.data.records.length > 0 ? (
            <div style={{ height: 280 }}>
              <CategoricalBarChart
                data={memResult.data.records.map((r: Record<string, unknown>) => ({
                  category: String(r['name'] ?? '?'),
                  value: Number(r['Used'] ?? 0),
                }))}
              >
                <CategoricalBarChart.ValueAxis />
                <CategoricalBarChart.CategoryAxis />
              </CategoricalBarChart>
            </div>
          ) : (
            <LoadingPlaceholder message={memResult.isLoading ? 'Loading…' : (demoMode ? 'Demo mode — no live data' : 'No memory data')} />
          )}
        </Card>
      </Flex>

      {/* Busiest interfaces */}
      <Card title={`Busiest Interfaces (Top ${limit})`} query={qBusiestInterfaces}>
        {busiestData ? (
          <div style={{ height: 300 }}>
            <TimeseriesChart data={busiestData as any} />
          </div>
        ) : (
          <LoadingPlaceholder message={busiestResult.isLoading ? 'Loading…' : (demoMode ? 'Demo mode — no live data' : 'No interface data')} />
        )}
      </Card>

      {/* Network neighbors table */}
      <Card title="Network Neighbors (SNMP Autodiscovery)" query={qNeighbors}>
        {neighborsResult.data?.records && neighborsResult.data.records.length > 0 ? (
          <DataTable
            data={neighborsResult.data.records}
            columns={neighborColumns as any}
            sortable
            fullWidth
            variant={{ verticalDividers: true }}
          >
            <DataTable.Pagination defaultPageSize={25} />
          </DataTable>
        ) : (
          <LoadingPlaceholder message={neighborsResult.isLoading ? 'Loading…' : (demoMode ? 'Demo mode — no live data' : 'No neighbor data')} />
        )}
      </Card>
    </Flex>
  );
};
