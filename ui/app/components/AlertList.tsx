import React, { useMemo, useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { Link } from '@dynatrace/strato-components/typography';
import { DataTable } from '@dynatrace/strato-components-preview/tables';
import { Menu } from '@dynatrace/strato-components-preview/navigation';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { useDql } from '@dynatrace-sdk/react-hooks';
import {
  CheckmarkIcon,
  DocumentIcon,
  ArrowUpIcon,
  ListIcon,
  MagnifyingGlassIcon,
  NotificationActiveIcon,
  ExternalLinkIcon,
  OpenWithIcon,
} from '@dynatrace/strato-icons';

import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_ALERTS } from '../data/demoData';
import { ActionModal } from './ActionModal';
import type { NetworkAction, DemoAlert } from '../types/network';
import { getDeviceUrl, openDeviceDetail, getProblemUrl, openProblemDetail, entityLinkStyle } from '../utils';

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
const ROW_ACTIONS: { Icon: React.ComponentType; label: string; type: NetworkAction['type'] }[] = [
  { Icon: CheckmarkIcon, label: 'Acknowledge',    type: 'acknowledge' },
  { Icon: DocumentIcon,  label: 'Create Ticket',  type: 'create-ticket' },
  { Icon: ArrowUpIcon,   label: 'Escalate',       type: 'escalate' },
  { Icon: ListIcon,      label: 'Run Runbook',    type: 'runbook' },
  { Icon: MagnifyingGlassIcon, label: 'Root Cause', type: 'root-cause' },
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
    icon: ROW_ACTIONS.find(a => a.type === actionType)?.label ?? actionType,
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

/* ── Davis event.category → DemoAlert severity ── */
const mapSeverity = (cat: string): DemoAlert['severity'] => {
  if (cat === 'AVAILABILITY') return 'critical';
  if (cat === 'ERROR') return 'major';
  if (cat === 'RESOURCE_CONTENTION') return 'minor';
  return 'info';
};

/* ── Davis event.category → DemoAlert category ── */
const mapCategory = (cat: string): DemoAlert['category'] => {
  if (cat === 'AVAILABILITY') return 'REACHABILITY';
  if (cat === 'RESOURCE_CONTENTION') return 'SATURATION';
  if (cat === 'ERROR') return 'ERRORS';
  return 'TRAFFIC';
};

const LIVE_ALERTS_QUERY = [
  `fetch dt.davis.problems`,
  `| fieldsAdd problem_event_id = event.id`,
  `| expand affected_entity_ids`,
  `| filter startsWith(affected_entity_ids, "CUSTOM_DEVICE")`,
  `| dedup display_id`,
  `| fields display_id, problem_event_id, event.name, event.category, event.status, timestamp, affected_entity_ids`,
  `| sort timestamp desc`,
  `| limit 50`,
].join('\n');

interface AlertListProps {
  liveAlerts?: DemoAlert[];
}

export const AlertList = ({ liveAlerts }: AlertListProps) => {
  const { demoMode } = useDemoMode();
  const [filter, setFilter] = useState<FilterTab>('active');
  const [selectedRowAction, setSelectedRowAction] = useState<NetworkAction | null>(null);

  /* ── Live DQL query for alerts ────────────────── */
  const { data: liveData } = useDql(
    { query: LIVE_ALERTS_QUERY },
    { enabled: !demoMode, refetchInterval: 60_000 },
  );

  const liveMappedAlerts = useMemo<DemoAlert[]>(() => {
    if (demoMode || !liveData?.records) return [];
    return liveData.records.map((r: Record<string, unknown>) => {
      const ts = r['timestamp'];
      const startDate = ts instanceof Date ? ts : new Date(String(ts ?? ''));
      const nowMs = Date.now();
      const durationMins = Math.max(0, Math.round((nowMs - startDate.getTime()) / 60_000));
      const eventCat = String(r['event.category'] ?? '');
      const eventStatus = String(r['event.status'] ?? 'ACTIVE');
      const entityId = String(r['affected_entity_ids'] ?? '');
      const displayId = String(r['display_id'] ?? '');
      const eventId = String(r['problem_event_id'] ?? r['event.id'] ?? '');
      return {
        id: displayId,
        title: String(r['event.name'] ?? displayId ?? 'Unknown'),
        severity: mapSeverity(eventCat),
        category: mapCategory(eventCat),
        entity: entityId,
        entityId,
        problemId: displayId,
        problemEventId: eventId,
        startedAt: startDate,
        status: (eventStatus === 'CLOSED' ? 'CLOSED' : 'ACTIVE') as DemoAlert['status'],
        durationMins,
      };
    });
  }, [demoMode, liveData]);

  const allAlerts = demoMode ? DEMO_ALERTS : (liveAlerts ?? liveMappedAlerts);

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

  const columns: any[] = useMemo(() => [
    {
      id: 'severity',
      header: 'Sev',
      accessor: 'severity',
      cell: ({ value }: { value: string }) => {
        const s = SEV[value as keyof typeof SEV] ?? SEV.info;
        return (
          <span
            style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 10,
              letterSpacing: '0.5px',
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
      id: 'title',
      header: 'Alert',
      accessor: 'title',
      columnType: 'text',
      width: '1fr',
    },
    {
      id: 'category',
      header: 'Category',
      accessor: (row: DemoAlert) => CATEGORY_LABEL[row.category] ?? row.category,
      columnType: 'text',
      width: 110,
    },
    {
      id: 'entity',
      header: 'Entity',
      accessor: 'entity',
      cell: ({ value, rowData }: { value: string; rowData: DemoAlert }) => {
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
      width: 200,
    },
    {
      id: 'problemId',
      header: 'Problem',
      accessor: 'problemId',
      cell: ({ value, rowData }: { value?: string; rowData: DemoAlert }) => {
        if (!value) return <span style={{ opacity: 0.35 }}>—</span>;
        const eventId = rowData?.problemEventId || value;
        return (
          <a
            href={getProblemUrl(eventId)}
            target="_blank"
            rel="noopener"
            style={entityLinkStyle}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); openProblemDetail(eventId); }}
            title={`Open problem ${value} in Dynatrace`}
          >
            <Flex alignItems="center" gap={4}>
              <OpenWithIcon style={{ width: 12, height: 12 }} />
              {value}
            </Flex>
          </a>
        );
      },
      width: 140,
    },
    {
      id: 'durationMins',
      header: 'Age',
      accessor: (row: DemoAlert) => formatDuration(row.durationMins),
      columnType: 'text',
      alignment: 'right',
      width: 70,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      cell: ({ value }: { value: string }) => (
        <span
          style={{
            padding: '2px 6px', borderRadius: 4,
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
      id: 'snowIncidentUrl',
      header: 'ServiceNow',
      accessor: 'snowIncidentUrl',
      disableSorting: true,
      cell: ({ value }: { value?: string }) => {
        if (!value) return <span style={{ opacity: 0.35 }}>—</span>;
        const incId = value.match(/sys_id=(INC\w+)/)?.[1] ?? 'Incident';
        return (
          <Link href={value} target="_blank" rel="noopener noreferrer">
            <Flex alignItems="center" gap={4}>
              <ExternalLinkIcon style={{ width: 12, height: 12 }} />
              {incId}
            </Flex>
          </Link>
        );
      },
      width: 130,
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
          <Flex alignItems="center" gap={8}>
            <NotificationActiveIcon />
            <Heading level={5} style={{ margin: 0 }}>Active Network Alerts</Heading>
          </Flex>
          <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>
            {activeCount} active · {resolvedCount} resolved
          </Paragraph>
        </Flex>

        <Flex gap={4}>
          {(['active', 'resolved', 'all'] as FilterTab[]).map(tab => (
            <Button
              key={tab}
              variant={filter === tab ? 'emphasized' : 'default'}
              size="condensed"
              onClick={() => setFilter(tab)}
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
          columns={columns as any}
          sortable
          fullWidth
          variant={{ verticalDividers: true }}
        >
          <DataTable.RowActions>
            {(row: DemoAlert) => {
              const ack = ROW_ACTIONS.find(a => a.type === 'acknowledge');
              const rest = ROW_ACTIONS.filter(a => a.type !== 'acknowledge');
              return (
                <>
                  {ack && (
                    <Button
                      color="primary"
                      onClick={() => setSelectedRowAction(buildRowAction(ack.type, row))}
                    >
                      <Button.Prefix><ack.Icon /></Button.Prefix>
                      {ack.label}
                    </Button>
                  )}
                  <Menu>
                    <Menu.Content>
                      {rest.map(ra => (
                        <Menu.Item
                          key={ra.type}
                          onSelect={() => setSelectedRowAction(buildRowAction(ra.type, row))}
                        >
                          <Menu.Prefix><ra.Icon /></Menu.Prefix>
                          {ra.label}
                        </Menu.Item>
                      ))}
                    </Menu.Content>
                  </Menu>
                </>
              );
            }}
          </DataTable.RowActions>
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
