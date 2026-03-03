import React, { useMemo } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { DataTable } from '@dynatrace/strato-components-preview/tables';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { useDql } from '@dynatrace-sdk/react-hooks';

import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_INTERFACES } from '../data/demoData';
import { NETWORK_QUERIES } from '../data/networkCategories';
import type { NetworkInterface } from '../types/network';

/* ── Status styling ───────────────────────────────── */
const IF_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  UP:   { color: '#2ab06f', bg: 'rgba(42,176,111,0.12)', label: 'UP' },
  DOWN: { color: '#dc172a', bg: 'rgba(220,23,42,0.12)', label: 'DOWN' },
  ADMIN_DOWN: { color: '#73b1ff', bg: 'rgba(115,177,255,0.12)', label: 'ADMIN DOWN' },
};

function loadBar(value: number): React.ReactElement {
  const color = value >= 80 ? '#dc172a' : value >= 60 ? '#fd8232' : '#2ab06f';
  return (
    <Flex alignItems="center" gap={6} style={{ minWidth: 90 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 2.5, background: 'rgba(255,255,255,0.08)' }}>
        <div
          style={{
            width: `${Math.min(value, 100)}%`, height: '100%',
            borderRadius: 2.5, background: color, transition: 'width 0.3s',
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
  if (gbps >= 1) return `${gbps.toFixed(2)} Gbps`;
  return `${(gbps * 1000).toFixed(0)} Mbps`;
}

function formatErrors(val: number): React.ReactElement {
  const color = val > 100 ? '#dc172a' : val > 0 ? '#fd8232' : '#2ab06f';
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', color }}>
      {val.toLocaleString()}
    </span>
  );
}

interface InterfaceTableProps {
  liveInterfaces?: NetworkInterface[];
}

const toNum = (v: unknown): number => {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const InterfaceTable = ({ liveInterfaces }: InterfaceTableProps) => {
  const { demoMode } = useDemoMode();

  /* ── Live DQL query ──────────────────────────────── */
  const { data: liveData, isLoading } = useDql(
    { query: NETWORK_QUERIES.interfaceHealth },
    { enabled: !demoMode, refetchInterval: 60_000 },
  );

  const liveMapped = useMemo<NetworkInterface[]>(() => {
    if (demoMode || !liveData?.records) return [];
    return liveData.records.map((r: Record<string, unknown>) => {
      const inBps = toNum(r['inTrafficBps']);
      const outBps = toNum(r['outTrafficBps']);
      const rawStatus = String(r['ifStatus'] ?? 'up').toLowerCase();
      const status: NetworkInterface['status'] = rawStatus === 'down' ? 'DOWN' : 'UP';
      return {
        entityId: String(r['dt.entity.network:interface'] ?? ''),
        deviceName: String(r['d.deviceName'] ?? ''),
        name: String(r['if.interfaceName'] ?? ''),
        status,
        inLoad: toNum(r['inLoad']),
        outLoad: toNum(r['outLoad']),
        inErrors: toNum(r['e.errorsIn']),
        outErrors: toNum(r['e.errorsOut']),
        inDiscards: toNum(r['e.discardsIn']),
        outDiscards: toNum(r['e.discardsOut']),
        trafficIn: inBps / 1_000_000_000,   // bps → Gbps
        trafficOut: outBps / 1_000_000_000,  // bps → Gbps
      };
    });
  }, [demoMode, liveData]);

  const interfaces = demoMode ? DEMO_INTERFACES : (liveInterfaces ?? liveMapped);

  const columns: any[] = useMemo(() => [
    {
      id: 'deviceName',
      header: 'Device',
      accessor: 'deviceName',
      columnType: 'text',
      width: 130,
    },
    {
      id: 'name',
      header: 'Interface',
      accessor: 'name',
      columnType: 'text',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      cell: ({ value }: { value: string }) => {
        const s = IF_STATUS[value] ?? IF_STATUS.UP;
        return (
          <span
            style={{
              padding: '2px 8px', borderRadius: 10,
              background: s.bg, color: s.color, border: `1px solid ${s.color}40`,
              whiteSpace: 'nowrap',
            }}
          >
            {s.label}
          </span>
        );
      },
      width: 100,
    },
    {
      id: 'inLoad',
      header: 'In Load',
      accessor: 'inLoad',
      cell: ({ value }: { value: number }) => loadBar(value),
      width: 130,
    },
    {
      id: 'outLoad',
      header: 'Out Load',
      accessor: 'outLoad',
      cell: ({ value }: { value: number }) => loadBar(value),
      width: 130,
    },
    {
      id: 'inErrors',
      header: 'In Errors',
      accessor: 'inErrors',
      cell: ({ value }: { value: number }) => formatErrors(value),
      width: 80,
    },
    {
      id: 'outErrors',
      header: 'Out Errors',
      accessor: 'outErrors',
      cell: ({ value }: { value: number }) => formatErrors(value),
      width: 80,
    },
    {
      id: 'inDiscards',
      header: 'In Discards',
      accessor: 'inDiscards',
      cell: ({ value }: { value: number }) => formatErrors(value),
      width: 90,
    },
    {
      id: 'outDiscards',
      header: 'Out Discards',
      accessor: 'outDiscards',
      cell: ({ value }: { value: number }) => formatErrors(value),
      width: 90,
    },
    {
      id: 'trafficIn',
      header: 'Traffic In',
      accessor: 'trafficIn',
      cell: ({ value }: { value: number }) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTraffic(value)}</span>
      ),
      width: 100,
    },
    {
      id: 'trafficOut',
      header: 'Traffic Out',
      accessor: 'trafficOut',
      cell: ({ value }: { value: number }) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTraffic(value)}</span>
      ),
      width: 100,
    },
  ], []);

  const upCount = interfaces.filter(i => i.status === 'UP').length;
  const downCount = interfaces.filter(i => i.status === 'DOWN').length;

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
          <Heading level={5} style={{ margin: 0 }}>Interface Health</Heading>
          <Paragraph style={{ opacity: 0.6 }}>
            {interfaces.length} interfaces · {upCount} up · {downCount} down
          </Paragraph>
        </Flex>
      </Flex>

      {interfaces.length === 0 ? (
        <Flex alignItems="center" justifyContent="center" style={{ padding: 40, opacity: 0.5 }}>
          <Paragraph>No interface data available</Paragraph>
        </Flex>
      ) : (
        <DataTable
          data={interfaces}
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
