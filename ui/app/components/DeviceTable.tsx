import React, { useMemo } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { DataTable } from '@dynatrace/strato-components-preview/tables';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { useDql } from '@dynatrace-sdk/react-hooks';

import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_DEVICES } from '../data/demoData';
import { NETWORK_QUERIES } from '../data/networkCategories';
import type { NetworkDevice } from '../types/network';
import { getDeviceUrl, openDeviceDetail, mapLocationToCity, entityLinkStyle } from '../utils';

/* ── Status styling ───────────────────────────────── */
const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  UP:        { color: '#2ab06f', bg: 'rgba(42,176,111,0.12)' },
  DEGRADED:  { color: '#fd8232', bg: 'rgba(253,130,50,0.12)' },
  DOWN:      { color: '#dc172a', bg: 'rgba(220,23,42,0.12)' },
};

function percentBar(value: number, thresholds?: { warn: number; crit: number }): React.ReactElement {
  const w = thresholds?.warn ?? 60;
  const c = thresholds?.crit ?? 80;
  const color = value >= c ? '#dc172a' : value >= w ? '#fd8232' : '#2ab06f';
  return (
    <Flex alignItems="center" gap={6} style={{ minWidth: 100 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
        <div
          style={{
            width: `${Math.min(value, 100)}%`, height: '100%',
            borderRadius: 3, background: color, transition: 'width 0.3s',
          }}
        />
      </div>
      <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', width: 34, textAlign: 'right' }}>
        {value.toFixed(0)}%
      </span>
    </Flex>
  );
}

function formatTraffic(gbps: number): string {
  if (gbps >= 1) return `${gbps.toFixed(1)} Gbps`;
  return `${(gbps * 1000).toFixed(0)} Mbps`;
}

interface DeviceTableProps {
  liveDevices?: NetworkDevice[];
}

const toNum = (v: unknown): number => {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const DeviceTable = ({ liveDevices }: DeviceTableProps) => {
  const { demoMode } = useDemoMode();

  /* ── Live DQL query ──────────────────────────────── */
  const { data: liveData, isLoading } = useDql(
    { query: NETWORK_QUERIES.deviceInventory },
    { enabled: !demoMode, refetchInterval: 60_000 },
  );

  const liveMapped = useMemo<NetworkDevice[]>(() => {
    if (demoMode || !liveData?.records) return [];
    return liveData.records.map((r: Record<string, unknown>) => {
      const cpu = toNum(r['cpuPct']);
      const mem = toNum(r['memPct']);
      const problems = toNum(r['problems']);
      const status: NetworkDevice['status'] =
        problems > 0 ? 'DEGRADED' : cpu > 90 || mem > 90 ? 'DEGRADED' : 'UP';
      // Derive city from device name prefix (e.g., LON-Juniper-T4000-Core-Router → London)
      const deviceName = String(r['deviceName'] ?? '');
      return {
        entityId: String(r['id'] ?? ''),
        name: deviceName,
        ip: String(r['ip'] ?? ''),
        type: String(r['deviceType'] ?? ''),
        status,
        cpu,
        memory: mem,
        problems,
        reachability: 100,
        traffic: 0,
        location: mapLocationToCity(deviceName) || undefined,
      };
    });
  }, [demoMode, liveData]);

  const devices = demoMode ? DEMO_DEVICES : (liveDevices ?? liveMapped);

  const columns: any[] = useMemo(() => [
    {
      id: 'name',
      header: 'Device',
      accessor: 'name',
      cell: ({ value, rowData }: { value: string; rowData: NetworkDevice }) => {
        const eid = rowData.entityId;
        if (!eid) return <span>{value}</span>;
        return (
          <a
            href={getDeviceUrl(eid)}
            target="_blank"
            rel="noopener"
            style={entityLinkStyle}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); openDeviceDetail(eid); }}
            title={`Open ${value} in Infra & Operations`}
          >
            {value}
          </a>
        );
      },
    },
    {
      id: 'location',
      header: 'Location',
      accessor: (row: NetworkDevice) => row.location ?? '',
      columnType: 'text',
      width: 120,
    },
    {
      id: 'ip',
      header: 'IP Address',
      accessor: 'ip',
      columnType: 'text',
      width: 130,
    },
    {
      id: 'type',
      header: 'Type',
      accessor: 'type',
      columnType: 'text',
      width: 90,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      cell: ({ value }: { value: string }) => {
        const s = STATUS_STYLE[value] ?? STATUS_STYLE.UP;
        return (
          <span
            style={{
              padding: '2px 8px', borderRadius: 10,
              background: s.bg, color: s.color, border: `1px solid ${s.color}40`,
            }}
          >
            {value}
          </span>
        );
      },
      width: 90,
    },
    {
      id: 'cpu',
      header: 'CPU',
      accessor: 'cpu',
      cell: ({ value }: { value: number }) => percentBar(value),
      width: 140,
    },
    {
      id: 'memory',
      header: 'Memory',
      accessor: 'memory',
      cell: ({ value }: { value: number }) => percentBar(value),
      width: 140,
    },
    {
      id: 'problems',
      header: 'Problems',
      accessor: 'problems',
      cell: ({ value }: { value: number }) => (
        <span
          style={{
            fontWeight: 700,
            color: value > 0 ? '#dc172a' : '#2ab06f',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
      ),
      width: 80,
    },
    {
      id: 'reachability',
      header: 'Reachability',
      accessor: 'reachability',
      cell: ({ value }: { value: number }) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', color: value < 100 ? '#fd8232' : '#2ab06f' }}>
          {value.toFixed(1)}%
        </span>
      ),
      width: 100,
    },
    {
      id: 'traffic',
      header: 'Traffic',
      accessor: 'traffic',
      cell: ({ value }: { value: number }) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTraffic(value)}</span>
      ),
      width: 100,
    },
  ], []);

  return (
    <Flex
      flexDirection="column"
      gap={0}
      style={{
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
        style={{ padding: '12px 20px', borderBottom: `1px solid ${Colors.Border.Neutral.Default}` }}
      >
        <Flex alignItems="baseline" gap={12}>
          <Heading level={5} style={{ margin: 0 }}>Network Device Inventory</Heading>
          <Paragraph style={{ opacity: 0.6 }}>
            {devices.length} devices
          </Paragraph>
        </Flex>
      </Flex>

      {devices.length === 0 ? (
        <Flex alignItems="center" justifyContent="center" style={{ padding: 40, opacity: 0.5 }}>
          <Paragraph>No devices to display</Paragraph>
        </Flex>
      ) : (
        <DataTable
          data={devices}
          columns={columns as any}
          sortable
          fullWidth
          variant={{ verticalDividers: true }}
        >
          <DataTable.Pagination defaultPageSize={25} />
        </DataTable>
      )}
    </Flex>
  );
};
