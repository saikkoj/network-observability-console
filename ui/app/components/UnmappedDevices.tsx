/**
 * UnmappedDevices — Panel showing network devices that don't have a geographic location.
 *
 * These would be devices without lat/lon coordinates, displayed as a compact list
 * so operators can see what isn't mapped on the geographic map.
 */
import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { DataTable } from '@dynatrace/strato-components-preview/tables';
import { useDql } from '@dynatrace-sdk/react-hooks';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_DEVICES } from '../data/demoData';
import { getDeviceUrl, openDeviceDetail, entityLinkStyle } from '../utils';
import { ListIcon } from '@dynatrace/strato-icons';

/**
 * In live mode: fetch all network devices. Devices that lack location metadata
 * (dt.geo.latitude / dt.geo.longitude) are considered "unmapped".
 *
 * In demo mode: show a subset of demo devices marked as unmapped.
 */
const Q_ALL_DEVICES = `fetch \`dt.entity.network:device\`
| fieldsAdd entity.name, dt.ip_addresses, tags, lifetime
| fields id, name = entity.name, ip = dt.ip_addresses[0]
| limit 200`;

interface UnmappedDevicesProps {
  height?: number | string;
}

export const UnmappedDevices = ({ height = 400 }: UnmappedDevicesProps) => {
  const { demoMode } = useDemoMode();
  const { data, isLoading } = useDql({ query: Q_ALL_DEVICES }, { enabled: !demoMode });

  /* Demo fallback — show all demo devices as "unmapped" for illustration */
  const demoRows = React.useMemo(
    () =>
      DEMO_DEVICES.map((d) => ({
        name: d.name,
        ip: d.ip,
        type: d.type,
        status: d.status,
        cpu: d.cpu,
        memory: d.memory,
      })),
    [],
  );

  const liveRows = React.useMemo(() => {
    if (!data?.records) return [];
    return data.records.map((r: Record<string, unknown>) => ({
      name: String(r['name'] ?? ''),
      ip: String(r['ip'] ?? '—'),
      id: String(r['id'] ?? ''),
    }));
  }, [data]);

  const rows: any[] = demoMode ? demoRows : liveRows;

  const columns: any[] = React.useMemo(
    () =>
      demoMode
        ? [
            {
              id: 'name',
              header: 'Device',
              accessor: 'name',
              width: '2fr',
              resizable: true,
              cell: ({ value }: { value: string }) => (
                <span style={entityLinkStyle} title="Demo device">{value}</span>
              ),
            },
            { id: 'ip', header: 'IP', accessor: 'ip', width: '1fr', resizable: true },
            { id: 'type', header: 'Type', accessor: 'type', width: '1fr', resizable: true },
            {
              id: 'status',
              header: 'Status',
              accessor: 'status',
              width: '1fr',
              resizable: true,
              cell: ({ value }: { value: string }) => (
                <span
                  style={{
                    fontSize: 10,
                    color: value === 'UP' ? '#2ab06f' : value === 'DOWN' ? '#dc172a' : '#fd8232',
                  }}
                >
                  {value}
                </span>
              ),
            },
            {
              id: 'cpu',
              header: 'CPU',
              accessor: 'cpu',
              width: '1fr',
              resizable: true,
              cell: ({ value }: { value: number }) => (
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                  {value != null ? `${value}%` : '—'}
                </span>
              ),
            },
          ]
        : [
            {
              id: 'name',
              header: 'Device',
              accessor: 'name',
              width: '2fr',
              resizable: true,
              cell: ({ value, rowData }: { value: string; rowData: Record<string, unknown> }) => {
                const entityId = rowData['id'] as string | undefined;
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
            { id: 'ip', header: 'IP', accessor: 'ip', width: '1fr', resizable: true },
          ],
    [demoMode],
  );

  return (
    <Flex
      flexDirection="column"
      style={{
        background: Colors.Background.Surface.Default,
        border: `1px solid ${Colors.Border.Neutral.Default}`,
        borderRadius: Borders.Radius.Container.Default,
        boxShadow: BoxShadows.Surface.Raised.Rest,
        overflow: 'hidden',
        height: typeof height === 'number' ? height : undefined,
      }}
    >
      {/* Header */}
      <Flex
        alignItems="center"
        justifyContent="space-between"
        style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
        }}
      >
        <Flex alignItems="center" gap={8}>
          <ListIcon />
          <Heading level={6} style={{ margin: 0 }}>Unmapped Devices</Heading>
        </Flex>
        <Paragraph style={{ fontSize: 11, opacity: 0.5 }}>
          {rows.length} device{rows.length !== 1 ? 's' : ''}
        </Paragraph>
      </Flex>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
        {isLoading && !demoMode ? (
          <Flex alignItems="center" justifyContent="center" style={{ height: 200, opacity: 0.5 }}>
            <Paragraph>Loading devices…</Paragraph>
          </Flex>
        ) : rows.length > 0 ? (
          <DataTable
            data={rows}
            columns={columns as any}
            sortable
            fullWidth
            variant={{ verticalDividers: true }}
          >
            <DataTable.Pagination defaultPageSize={15} />
          </DataTable>
        ) : (
          <Flex alignItems="center" justifyContent="center" style={{ height: 200, opacity: 0.5 }}>
            <Paragraph>No unmapped devices</Paragraph>
          </Flex>
        )}
      </div>
    </Flex>
  );
};
