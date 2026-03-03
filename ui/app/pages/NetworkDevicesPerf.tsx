/**
 * NetworkDevicesPerf — Tab page from the "Network Devices" dashboard.
 *
 * Includes: total devices, devices with problems, total problems, total traffic,
 * CPU/memory charts, interface load/traffic, interfaces up/down, discards/errors, reachability.
 *
 * Supports:
 * - deviceFilter: string[] — when non-empty, DQL queries filter to those device names
 *   (equivalent to dashboard variable $NetworkDevices)
 * - topLimit: number — controls "top N" limit in ranked queries
 *   (equivalent to dashboard variable $TopLimit)
 *
 * Dynatrace Segments are applied automatically by the platform via SegmentSelector
 * on the parent page.
 */
import React, { useMemo } from 'react';
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

/** Build a DQL filter clause for fetch queries by entity.name */
const deviceFilterClause = (names: string[]) => {
  if (names.length === 0) return '';
  const list = names.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ');
  return `| filter in(entity.name, array(${list}))`;
};

/** Build a DQL filter clause for timeseries by device entity name */
const tsDeviceFilter = (names: string[]) => {
  if (names.length === 0) return '';
  const list = names.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ');
  return `| filter in(entityName(\`dt.entity.network:device\`), array(${list}))`;
};

/* ─────────────────────────── Card wrapper ─────────────────────────── */
const Card = ({
  title,
  description,
  children,
  style,
  query,
}: {
  title?: string;
  description?: string;
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
      <Flex flexDirection="column" gap={2} style={{ marginBottom: 12 }}>
        <Flex alignItems="center" justifyContent="space-between">
          <Heading level={6} style={{ margin: 0, opacity: 0.8 }}>{title}</Heading>
          {query && (
            <IntentButton payload={{ 'dt.query': query }} size="condensed">
              Open with
            </IntentButton>
          )}
        </Flex>
        {description && (
          <Paragraph style={{ fontSize: 11, opacity: 0.5 }}>{description}</Paragraph>
        )}
      </Flex>
    )}
    {children}
  </div>
);

const LoadingPlaceholder = ({ message = 'Loading…' }: { message?: string }) => (
  <Flex alignItems="center" justifyContent="center" style={{ height: 120, opacity: 0.5 }}>
    <Paragraph>{message}</Paragraph>
  </Flex>
);

/* ─────────────────────────── Query builders ─────────────────────────── */

const buildTotalDevices = (df: string[]) =>
  `fetch \`dt.entity.network:device\`\n${deviceFilterClause(df)}\n| summarize count(), alias: devices`;

const buildDevicesWithProblems = (df: string[]) =>
  `fetch \`dt.entity.network:device\`\n${deviceFilterClause(df)}
| lookup [
  fetch dt.davis.problems
  | filter event.status == "ACTIVE"
  | expand affected_entity_ids
  | filter startsWith(affected_entity_ids, "CUSTOM_DEVICE")
  | summarize problems = count(), by: {affected_entity_ids}
], sourceField: id, lookupField: affected_entity_ids, fields: {problems}
| filter isNotNull(problems) and problems > 0
| summarize count = count()`;

const buildTotalProblems = (df: string[]) => {
  if (df.length === 0) {
    return `fetch dt.davis.problems
| filter in(affected_entity_types, "dt.entity.network:device")
| filter event.status == "ACTIVE"
| expand affected_entity_ids
| summarize count(), by: { display_id }
| summarize count = count()`;
  }
  // When filtered by device names, join problems to the filtered devices
  const list = df.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ');
  return `fetch dt.davis.problems
| filter event.status == "ACTIVE"
| expand affected_entity_ids
| filter startsWith(affected_entity_ids, "CUSTOM_DEVICE")
| lookup [
  fetch \`dt.entity.network:device\`
  | filter in(entity.name, array(${list}))
], sourceField: affected_entity_ids, lookupField: id, fields: {deviceName = entity.name}
| filter isNotNull(deviceName)
| summarize count(), by: { display_id }
| summarize count = count()`;
};

const buildCpu = (df: string[], limit: number) =>
  `timeseries {
  cpuPerc = avg(com.dynatrace.extension.network_device.cpu_usage)
},
by: {\`dt.entity.network:device\`},
union:true
| fieldsAdd name = entityName(\`dt.entity.network:device\`)
${tsDeviceFilter(df)}
| sort cpuPerc DESC
| limit ${limit}
| fields \`dt.entity.network:device\`, name, cpuPerc, timeframe, interval`;

const buildMemory = (df: string[], limit: number) =>
  `timeseries {
  memoryUsed = avg(com.dynatrace.extension.network_device.memory_used),
  memoryFree = avg(com.dynatrace.extension.network_device.memory_free),
  memoryTotal = avg(com.dynatrace.extension.network_device.memory_total),
  memoryUsage = avg(com.dynatrace.extension.network_device.memory_usage)
},
by: {\`dt.entity.network:device\`},
union:true
| fieldsAdd memoryUsed = coalesce(memoryUsed[], memoryTotal[] - memoryFree[])
| fieldsAdd memoryTotal = coalesce(memoryTotal[], memoryUsed[] + memoryFree[])
| fieldsAdd memory = coalesce(memoryUsage[], memoryUsed[] * 100 / memoryTotal[])
| fieldsAdd name = entityName(\`dt.entity.network:device\`)
${tsDeviceFilter(df)}
| sort memory DESC
| limit ${limit}
| fields \`dt.entity.network:device\`, name, memory, timeframe, interval`;

const buildTrafficTop = (df: string[], limit: number) =>
  `timeseries {
  ifcBytesIn = sum(com.dynatrace.extension.network_device.if.bytes_in.count, default: 0),
  ifcBytesOut = sum(com.dynatrace.extension.network_device.if.bytes_out.count, default: 0)
},
filter: isNotNull(\`dt.entity.network:interface\`),
by:{ \`dt.entity.network:device\`, \`dt.entity.network:interface\`, if.speed}, union:true
| fieldsAdd lastBitsInOutPerSecond = (arrayAvg(ifcBytesIn)+arrayAvg(ifcBytesOut))*8/(toDouble(interval)/1000000000)
| summarize {
  bitsInOutPerSecond = sum(lastBitsInOutPerSecond)
}, by: {\`dt.entity.network:device\`}
| filterOut isNull(bitsInOutPerSecond)
| fieldsAdd name = entityName(\`dt.entity.network:device\`)
${tsDeviceFilter(df)}
| sort bitsInOutPerSecond DESC
| limit ${limit}
| fields \`dt.entity.network:device\`, name, bitsInOutPerSecond`;

const buildIfcInboundLoad = (df: string[], limit: number) =>
  `timeseries {
  bytesIn = sum(com.dynatrace.extension.network_device.if.bytes_in.count, default: 0)
},
by: {\`dt.entity.network:interface\`, if.name, if.speed, \`dt.entity.network:device\`},
union: true
| filterOut isNull(if.speed) or if.speed == "0"
| fieldsAdd bitsInPerSec = bytesIn[] * 8 / (toLong(interval) / 1000000000),
            interfaceSpeedBitsPerSec = toDouble(if.speed) * power(10, 6)
| fieldsAdd load = bitsInPerSec[] / interfaceSpeedBitsPerSec * 100
${tsDeviceFilter(df)}
| sort load desc
| limit ${limit}`;

const buildIfcOutboundLoad = (df: string[], limit: number) =>
  `timeseries {
  bytesOut = sum(com.dynatrace.extension.network_device.if.bytes_out.count, default: 0)
},
by: {\`dt.entity.network:interface\`, if.speed, \`dt.entity.network:device\`},
union: true
| filterOut isNull(if.speed) or if.speed == "0"
| fieldsAdd bitsPerSec = bytesOut[] * 8 / (toLong(interval) / 1000000000),
            interfaceSpeedBitsPerSec = toDouble(if.speed) * power(10, 6),
            interfaceName = entityName(\`dt.entity.network:interface\`)
| fieldsAdd load = bitsPerSec[] / interfaceSpeedBitsPerSec * 100
${tsDeviceFilter(df)}
| sort load desc
| limit ${limit}`;

const buildIfcInboundTraffic = (df: string[], limit: number) =>
  `timeseries {
  bytesIn = sum(com.dynatrace.extension.network_device.if.bytes_in.count, default: 0)
},
by: {\`dt.entity.network:interface\`, if.name, \`dt.entity.network:device\`},
union: true
${tsDeviceFilter(df)}
| sort bytesIn DESC
| limit ${limit}
| fieldsAdd bitsInPerSec = bytesIn[] * 8 / (toLong(interval) / 1000000000)`;

const buildIfcOutboundTraffic = (df: string[], limit: number) =>
  `timeseries {
  bytesOut = sum(com.dynatrace.extension.network_device.if.bytes_out.count, default: 0)
},
by: {\`dt.entity.network:interface\`, if.name, \`dt.entity.network:device\`},
union: true
${tsDeviceFilter(df)}
| sort bytesOut DESC
| limit ${limit}
| fieldsAdd bitsOutPerSec = bytesOut[] * 8 / (toLong(interval) / 1000000000)`;

const buildIfcUpDown = (df: string[], limit: number) =>
  `timeseries {
  status = avg(com.dynatrace.extension.network_device.if.status)
}, 
by: {
  \`dt.entity.network:interface\`, \`dt.entity.network:device\`, oper.status, admin.status,
  device.name, if.name
}
| fieldsAdd record = record(
  latestStatusIndex = arrayLastIndexOf(status, arrayLast(status)),
  adminStatus = admin.status,
  operStatus = oper.status,
  device=\`dt.entity.network:device\`,
  interface = \`dt.entity.network:interface\`,
  deviceName = entityName(\`dt.entity.network:device\`),
  interfaceName = entityName(\`dt.entity.network:interface\`)
)
| summarize record = takeMax(record), by: { \`dt.entity.network:interface\` }
| filter startsWith(record[adminStatus], "up", caseSensitive: false) 
     and startsWith(record[operStatus], "down", caseSensitive: false)
| fields \`dt.entity.network:device\` = record[device], Device = record[deviceName], Interface = record[interfaceName]
${df.length > 0 ? `| filter in(Device, array(${df.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ')}))` : ''}
| sort Device ASC, Interface ASC
| limit ${limit}`;

const buildDiscardsErrors = (df: string[], limit: number) =>
  `timeseries {
  errorsIn = sum(com.dynatrace.extension.network_device.if.in.errors.count),
  errorsOut = sum(com.dynatrace.extension.network_device.if.out.errors.count),
  discardsIn = sum(com.dynatrace.extension.network_device.if.in.discards.count),
  discardsOut = sum(com.dynatrace.extension.network_device.if.out.discards.count)
}, 
by: {\`dt.entity.network:interface\`, if.name, \`dt.entity.network:device\`}, 
union: true
| fieldsAdd sum = coalesce(errorsIn[], 0) + coalesce(errorsOut[], 0) + 
                  coalesce(discardsIn[], 0) + coalesce(discardsOut[], 0)
| fieldsAdd sumAvgPerSecond = arrayAvg(sum) / (toDouble(interval) / 1000000000)
${tsDeviceFilter(df)}
| sort sumAvgPerSecond DESC
| limit ${limit}
| fields \`dt.entity.network:device\`, Device = entityName(\`dt.entity.network:device\`), Interface = entityName(\`dt.entity.network:interface\`), \`Discards and errors\` = sumAvgPerSecond`;

const buildReachability = (df: string[], limit: number) => {
  const devFilter = df.length > 0
    ? `| filter in(deviceName, array(${df.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(', ')}))`
    : '';
  return `timeseries availability = avg(dt.synthetic.multi_protocol.request.availability),
by: {dt.entity.multiprotocol_monitor, multi_protocol.request.target_address, request.target_address}
| fieldsAdd targetAddress = coalesce(request.target_address, multi_protocol.request.target_address)
| lookup [
  fetch \`dt.entity.network:device\`
  | expand dt.ip_addresses
], sourceField: targetAddress, lookupField: dt.ip_addresses, fields: {deviceId = id, deviceName = entity.name}
| filterOut isNull(deviceId)
${devFilter}
| summarize {
  availability = avg(arrayAvg(availability))
}, by: {monitor = dt.entity.multiprotocol_monitor, deviceId, deviceName}
| fieldsAdd name = entityName(monitor, type: "dt.entity.multiprotocol_monitor")
| filterOut isNull(name)
| summarize {
  totalMonitors = count(),
  unavailableMonitors = countIf(availability < 100)
}, by:{ deviceId, deviceName }
| fieldsAdd reachability = 100 * (totalMonitors - unavailableMonitors) / toDouble(totalMonitors)
| sort reachability ASC
| limit ${limit}
| fields deviceId, name = deviceName, reachability`;
};

/* ─────────────────────────── Stat card ─────────────────────────── */
const StatCard = ({ title, query, field = 'count' }: { title: string; query: string; field?: string }) => {
  const { demoMode } = useDemoMode();
  const { data, isLoading } = useDql({ query }, { enabled: !demoMode });
  const val = data?.records?.[0]?.[field];
  const display = val != null ? String(val) : (demoMode ? '—' : '0');

  return (
    <Card style={{ flex: 1, minWidth: 100, textAlign: 'center' }}>
      <Paragraph style={{ fontSize: 10, fontWeight: 600, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
        {title}
      </Paragraph>
      <Heading level={2} style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
        {isLoading ? '…' : display}
      </Heading>
    </Card>
  );
};

/* ─────────────────────────── Timeseries chart card ─────────────────────────── */
const TsCard = ({ title, description, query, height = 260 }: { title: string; description?: string; query: string; height?: number }) => {
  const { demoMode } = useDemoMode();
  const result = useDql({ query }, { enabled: !demoMode });
  const chartData = useMemo(() => {
    if (!result.data?.records || !result.data?.types) return null;
    try { return convertToTimeseries(result.data.records, result.data.types as any[]); }
    catch { return null; }
  }, [result.data]);

  return (
    <Card title={title} description={description} query={query}>
      {chartData ? (
        <div style={{ height }}>
          <TimeseriesChart data={chartData as any} />
        </div>
      ) : (
        <LoadingPlaceholder message={result.isLoading ? 'Loading…' : (demoMode ? 'Demo mode — no live data' : 'No data')} />
      )}
    </Card>
  );
};

/* ─────────────────────────── Props ─────────────────────────── */
interface NetworkDevicesPerfProps {
  /** Selected device names from the parent FilterBar. Empty = show all. */
  deviceFilter?: string[];
  /** Max items in "top N" queries. Default 10. */
  topLimit?: number;
}

/* ─────────────────────────── Main component ─────────────────────────── */
export const NetworkDevicesPerf = ({ deviceFilter = [], topLimit = 10 }: NetworkDevicesPerfProps) => {
  const { demoMode } = useDemoMode();
  const df = deviceFilter;
  const limit = topLimit;

  /* ── Build queries (memoized on filter changes) ── */
  const qTotalDevices = useMemo(() => buildTotalDevices(df), [df]);
  const qDevicesWithProblems = useMemo(() => buildDevicesWithProblems(df), [df]);
  const qTotalProblems = useMemo(() => buildTotalProblems(df), [df]);
  const qCpu = useMemo(() => buildCpu(df, limit), [df, limit]);
  const qMemory = useMemo(() => buildMemory(df, limit), [df, limit]);
  const qTrafficTop = useMemo(() => buildTrafficTop(df, limit), [df, limit]);
  const qIfcInLoad = useMemo(() => buildIfcInboundLoad(df, limit), [df, limit]);
  const qIfcOutLoad = useMemo(() => buildIfcOutboundLoad(df, limit), [df, limit]);
  const qIfcInTraffic = useMemo(() => buildIfcInboundTraffic(df, limit), [df, limit]);
  const qIfcOutTraffic = useMemo(() => buildIfcOutboundTraffic(df, limit), [df, limit]);
  const qIfcUpDown = useMemo(() => buildIfcUpDown(df, limit), [df, limit]);
  const qDiscardsErrors = useMemo(() => buildDiscardsErrors(df, limit), [df, limit]);
  const qReachability = useMemo(() => buildReachability(df, limit), [df, limit]);

  /* Traffic top bar chart */
  const trafficResult = useDql({ query: qTrafficTop }, { enabled: !demoMode });

  /* Interfaces up/down table */
  const upDownResult = useDql({ query: qIfcUpDown }, { enabled: !demoMode });
  const upDownColumns: any[] = useMemo(() => [
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
    { id: 'interface', header: 'Interface', accessor: 'Interface', width: '1fr', resizable: true },
  ], []);

  /* Discards/errors table */
  const discardsResult = useDql({ query: qDiscardsErrors }, { enabled: !demoMode });
  const discardsColumns: any[] = useMemo(() => [
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
    { id: 'interface', header: 'Interface', accessor: 'Interface', width: '1fr', resizable: true },
    {
      id: 'discardsErrors',
      header: 'Discards+Errors /s',
      accessor: 'Discards and errors',
      cell: ({ value }: { value: number }) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value != null ? value.toFixed(4) : '—'}</span>
      ),
      width: '1fr',
      resizable: true,
    },
  ], []);

  /* Reachability table */
  const reachResult = useDql({ query: qReachability }, { enabled: !demoMode });
  const reachColumns: any[] = useMemo(() => [
    {
      id: 'device',
      header: 'Device',
      accessor: 'name',
      width: '1fr',
      resizable: true,
      cell: ({ value, rowData }: { value: string; rowData: Record<string, unknown> }) => {
        const entityId = rowData['deviceId'] as string | undefined;
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
    {
      id: 'reachability',
      header: 'Reachability %',
      accessor: 'reachability',
      cell: ({ value }: { value: number }) => {
        const color = value >= 100 ? '#2ab06f' : value >= 90 ? '#fd8232' : '#dc172a';
        return <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value != null ? `${value.toFixed(1)}%` : '—'}</span>;
      },
      width: '1fr',
      resizable: true,
    },
  ], []);

  const filterInfo = df.length > 0
    ? `Filtered to ${df.length} device${df.length > 1 ? 's' : ''} · Top ${limit}`
    : `All devices · Top ${limit}`;

  return (
    <Flex flexDirection="column" gap={16}>
      <Paragraph style={{ opacity: 0.7, fontSize: 13 }}>
        Network devices performance — problems, CPU, memory, traffic, interface load, saturation, errors &amp; discards, reachability.
        <span style={{ opacity: 0.5, marginLeft: 8, fontSize: 11 }}>({filterInfo})</span>
      </Paragraph>

      {/* KPI counters */}
      <Flex gap={12} flexWrap="wrap">
        <StatCard title="Total Devices" query={qTotalDevices} field="count()" />
        <StatCard title="Devices w/ Problems" query={qDevicesWithProblems} />
        <StatCard title="Total Problems" query={qTotalProblems} />
      </Flex>

      {/* CPU + Memory timeseries */}
      <Flex gap={16}>
        <div style={{ flex: 1 }}>
          <TsCard title={`Top ${limit} Devices by CPU`} description="Average CPU usage %" query={qCpu} />
        </div>
        <div style={{ flex: 1 }}>
          <TsCard title={`Top ${limit} Devices by Memory`} description="Memory utilization %" query={qMemory} />
        </div>
      </Flex>

      {/* Traffic bar chart */}
      <Card title={`Top ${limit} Devices by Network Traffic`} description="Total bandwidth (bits/sec) per device" query={qTrafficTop}>
        {trafficResult.data?.records && trafficResult.data.records.length > 0 ? (
          <div style={{ height: 280 }}>
            <CategoricalBarChart
              data={trafficResult.data.records.map((r: Record<string, unknown>) => ({
                category: String(r['name'] ?? '?'),
                value: Number(r['bitsInOutPerSecond'] ?? 0),
              }))}
            >
              <CategoricalBarChart.ValueAxis />
              <CategoricalBarChart.CategoryAxis />
            </CategoricalBarChart>
          </div>
        ) : (
          <LoadingPlaceholder message={trafficResult.isLoading ? 'Loading…' : (demoMode ? 'Demo mode — no live data' : 'No data')} />
        )}
      </Card>

      {/* Interface load: inbound + outbound */}
      <Flex gap={16}>
        <div style={{ flex: 1 }}>
          <TsCard title={`Top ${limit} Interfaces — Inbound Load %`} description="Utilization = traffic / interface speed" query={qIfcInLoad} />
        </div>
        <div style={{ flex: 1 }}>
          <TsCard title={`Top ${limit} Interfaces — Outbound Load %`} description="Utilization = traffic / interface speed" query={qIfcOutLoad} />
        </div>
      </Flex>

      {/* Interface traffic: inbound + outbound */}
      <Flex gap={16}>
        <div style={{ flex: 1 }}>
          <TsCard title={`Top ${limit} Interfaces — Inbound Traffic`} query={qIfcInTraffic} />
        </div>
        <div style={{ flex: 1 }}>
          <TsCard title={`Top ${limit} Interfaces — Outbound Traffic`} query={qIfcOutTraffic} />
        </div>
      </Flex>

      {/* Reachability + Interfaces Up/Down + Discards */}
      <Flex gap={16}>
        <Card title="Lowest Reachability" description="Devices with lowest synthetic monitor availability" style={{ flex: 1 }} query={qReachability}>
          {reachResult.data?.records && reachResult.data.records.length > 0 ? (
            <DataTable
              data={reachResult.data.records}
              columns={reachColumns as any}
              sortable
              fullWidth
              variant={{ verticalDividers: true }}
            >
              <DataTable.Pagination defaultPageSize={25} />
            </DataTable>
          ) : (
            <LoadingPlaceholder message={reachResult.isLoading ? 'Loading…' : (demoMode ? 'Demo mode — no live data' : 'No reachability data')} />
          )}
        </Card>
        <Card title="Interfaces Up/Down" description="Admin up, operationally down" style={{ flex: 1 }} query={qIfcUpDown}>
          {upDownResult.data?.records && upDownResult.data.records.length > 0 ? (
            <DataTable
              data={upDownResult.data.records}
              columns={upDownColumns as any}
              sortable
              fullWidth
              variant={{ verticalDividers: true }}
            >
              <DataTable.Pagination defaultPageSize={25} />
            </DataTable>
          ) : (
            <LoadingPlaceholder message={upDownResult.isLoading ? 'Loading…' : (demoMode ? 'Demo mode — no live data' : 'No up/down interfaces')} />
          )}
        </Card>
      </Flex>

      {/* Discards and errors */}
      <Card title={`Top ${limit} Interfaces — Discards & Errors`} description="Rate of combined errors and discards per second" query={qDiscardsErrors}>
        {discardsResult.data?.records && discardsResult.data.records.length > 0 ? (
          <DataTable
            data={discardsResult.data.records}
            columns={discardsColumns as any}
            sortable
            fullWidth
            variant={{ verticalDividers: true }}
          >
            <DataTable.Pagination defaultPageSize={25} />
          </DataTable>
        ) : (
          <LoadingPlaceholder message={discardsResult.isLoading ? 'Loading…' : (demoMode ? 'Demo mode — no live data' : 'No error data')} />
        )}
      </Card>
    </Flex>
  );
};
