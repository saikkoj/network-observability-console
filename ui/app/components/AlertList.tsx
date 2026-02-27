import React, { useMemo, useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { DataTable } from '@dynatrace/strato-components-preview/tables';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import type { TableColumn } from '@dynatrace/strato-components-preview/tables';

import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_ALERTS } from '../data/demoData';
import { ActionModal } from './ActionModal';
import type { NetworkAction, DemoAlert } from '../types/network';

/* ── Severity styling ─────────────────────────────── */
const SEV = {
  critical: { color: '#dc172a', bg: 'rgba(220,23,42,0.12)', label: 'CRITICAL', order: 0 },
  major:    { color: '#fd8232', bg: 'rgba(253,130,50,0.12)', label: 'MAJOR',    order: 1 },
  minor:    { color: '#f5d30f', bg: 'rgba(245,211,15,0.12)', label: 'MINOR',    order: 2 },
  info:     { color: '#73b1ff', bg: 'rgba(115,177,255,0.12)', label: 'INFO',    order: 3 },
};

const CATEGORY_LABEL: Record<string, string> = {
  REACHABILITY: 'Reachability',
  SATURATION: 'Saturation',
  ERRORS: 'Errors',
  TRAFFIC: 'Traffic',
};

/* ── Per-row quick actions ────────────────────────── */
const ROW_ACTIONS: { icon: string; label: string; type: NetworkAction['type']; tip: string }[] = [
  { icon: '✅', label: 'Ack',     type: 'acknowledge',   tip: 'Acknowledge this alert' },
  { icon: '🎫', label: 'Ticket',  type: 'create-ticket', tip: 'Create incident ticket' },
  { icon: '⬆️', label: 'Escalate', type: 'escalate',      tip: 'Escalate to L2/L3' },
  { icon: '📋', label: 'Runbook', type: 'runbook',       tip: 'Execute runbook' },
  { icon: '🔍', label: 'RCA',     type: 'root-cause',    tip: 'AI root cause analysis' },
];

function buildRowAction(actionType: NetworkAction['type'], alert: DemoAlert): NetworkAction {
  const labelMap: Record<string, string> = {
    acknowledge: 'Acknowledge',
    'create-ticket': 'Create Ticket',
    escalate: 'Escalate',
    runbook: 'Run Runbook',
    'root-cause': 'Root Cause Analysis',
  };
  return {
    type: actionType,
    label: `${labelMap[actionType] ?? actionType} — ${alert.title}`,
    icon: ROW_ACTIONS.find(a => a.type === actionType)?.icon ?? '⚡',
    description: `Execute ${labelMap[actionType] ?? actionType} for "${alert.title}" on ${alert.entity}.`,
    confirmMessage: `${labelMap[actionType] ?? actionType} for "${alert.title}" (${alert.entity})?`,
    successMessage: `${labelMap[actionType] ?? actionType} initiated for ${alert.title}.`,
    workflowId: `wf-${actionType}-single`,
    params: { problemId: alert.id, entity: alert.entity, category: alert.category, trigger: 'row-action' },
  };
}

function formatDuration(mins: number): string {
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

type FilterTab = 'active' | 'resolved' | 'all';

interface AlertListProps {
  liveAlerts?: DemoAlert[];
}

export const AlertList = ({ liveAlerts }: AlertListProps) => {
  const { demoMode } = useDemoMode();
  const [filter, setFilter] = useState<FilterTab>('active');
  const [selectedRowAction, setSelectedRowAction] = useState<NetworkAction | null>(null);

  const allAlerts = demoMode ? DEMO_ALERTS : (liveAlerts ?? []);

  const filteredAlerts = useMemo(() => {
    const sorted = [...allAlerts].sort((a, b) => {
      const sevDiff = SEV[a.severity].order - SEV[b.severity].order;
      if (sevDiff !== 0) return sevDiff;
      return b.startedAt.getTime() - a.startedAt.getTime();
    });
    if (filter === 'active') return sorted.filter(a => a.status === 'ACTIVE');
    if (filter === 'resolved') return sorted.filter(a => a.status === 'CLOSED');
    return sorted;
  }, [allAlerts, filter]);

  const activeCount = allAlerts.filter(a => a.status === 'ACTIVE').length;
  const resolvedCount = allAlerts.filter(a => a.status === 'CLOSED').length;

  const columns = useMemo<TableColumn[]>(() => [
    {
      header: 'Sev',
      accessor: 'severity',
      cell: ({ value }: { value: string }) => {
        const s = SEV[value as keyof typeof SEV] ?? SEV.info;
        return (
          <span
            style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 10,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
              background: s.bg, color: s.color, border: `1px solid ${s.color}40`,
              whiteSpace: 'nowrap',
            }}
          >
            {s.label}
          </span>
        );
      },
      disableSortBy: false,
      width: 90,
    },
    {
      header: 'Alert',
      accessor: 'title',
    },
    {
      header: 'Category',
      accessor: 'category',
      cell: ({ value }: { value: string }) => (
        <span style={{ fontSize: 12, opacity: 0.8 }}>{CATEGORY_LABEL[value] ?? value}</span>
      ),
      width: 100,
    },
    {
      header: 'Entity',
      accessor: 'entity',
      cell: ({ value }: { value: string }) => (
        <span style={{ fontSize: 12, fontFamily: 'monospace', opacity: 0.85 }}>{value}</span>
      ),
      width: 200,
    },
    {
      header: 'Age',
      accessor: 'durationMins',
      cell: ({ value }: { value: number }) => (
        <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatDuration(value)}</span>
      ),
      width: 80,
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ value }: { value: string }) => (
        <span
          style={{
            fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
            background: value === 'ACTIVE' ? 'rgba(220,23,42,0.10)' : 'rgba(42,176,111,0.10)',
            color: value === 'ACTIVE' ? '#dc172a' : '#2ab06f',
          }}
        >
          {value}
        </span>
      ),
      width: 80,
    },
    {
      header: 'ID',
      accessor: 'id',
      cell: ({ value }: { value: string }) => (
        <span style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.6 }}>{value}</span>
      ),
      width: 110,
    },
    {
      header: 'Actions',
      accessor: '_actions',
      disableSortBy: true,
      cell: ({ row }: { row: { original: DemoAlert } }) => {
        const alert = row.original;
        return (
          <Flex gap={2} alignItems="center" style={{ flexWrap: 'nowrap' }}>
            {ROW_ACTIONS.map((ra) => (
              <button
                key={ra.type}
                title={ra.tip}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRowAction(buildRowAction(ra.type, alert));
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  padding: '2px 5px', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4, background: 'rgba(255,255,255,0.03)',
                  cursor: 'pointer', fontSize: 10, fontWeight: 600,
                  color: 'inherit', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <span style={{ fontSize: 11 }}>{ra.icon}</span>
                {ra.label}
              </button>
            ))}
          </Flex>
        );
      },
      width: 310,
    },
  ], []);

  const data = useMemo(() => filteredAlerts, [filteredAlerts]);

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
      {/* Table header bar */}
      <Flex
        alignItems="center"
        justifyContent="space-between"
        style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
        }}
      >
        <Flex alignItems="baseline" gap={12}>
          <Heading level={5} style={{ margin: 0 }}>🚨 Active Network Alerts</Heading>
          <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>
            {activeCount} active · {resolvedCount} resolved
          </Paragraph>
        </Flex>

        <Flex gap={4}>
          {(['active', 'resolved', 'all'] as FilterTab[]).map(tab => (
            <Button
              key={tab}
              variant={filter === tab ? 'emphasized' : 'default'}
              onClick={() => setFilter(tab)}
              style={{ fontSize: 11, padding: '3px 10px', textTransform: 'capitalize' }}
            >
              {tab} {tab === 'active' ? `(${activeCount})` : tab === 'resolved' ? `(${resolvedCount})` : `(${allAlerts.length})`}
            </Button>
          ))}
        </Flex>
      </Flex>

      {/* DataTable */}
      {data.length === 0 ? (
        <Flex alignItems="center" justifyContent="center" style={{ padding: 40, opacity: 0.5 }}>
          <Paragraph>No alerts to display</Paragraph>
        </Flex>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          sortable
          fullWidth
          variant={{ rowDensity: 'condensed' }}
          height={440}
        >
          <DataTable.Pagination defaultPageSize={20} />
        </DataTable>
      )}

      {/* Row-level Action Modal */}
      {selectedRowAction && (
        <ActionModal
          show={!!selectedRowAction}
          onDismiss={() => setSelectedRowAction(null)}
          action={selectedRowAction}
        />
      )}
    </Flex>
  );
};
