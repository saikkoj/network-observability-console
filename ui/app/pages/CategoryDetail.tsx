import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@dynatrace/strato-components/buttons';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { Tabs, Tab } from '@dynatrace/strato-components-preview/navigation';
import { TimeseriesChart } from '@dynatrace/strato-components-preview/charts';
import { convertToTimeseries } from '@dynatrace/strato-components-preview/conversion-utilities';
import { useDql } from '@dynatrace-sdk/react-hooks';
import Borders from '@dynatrace/strato-design-tokens/borders';
import Colors from '@dynatrace/strato-design-tokens/colors';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';

import { NETWORK_CATEGORIES } from '../data/networkCategories';
import { AlertList } from '../components/AlertList';
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_ALERTS, DEMO_KPI, DEMO_KPI_WEEK_AGO, DEMO_SECONDARY_KPI, DEMO_SECONDARY_KPI_WEEK_AGO, DEMO_CHART_DATA } from '../data/demoData';
import type { NetworkCategoryId } from '../types/network';
import { computeSeverity, toNum, formatKpiValue, SEV_COLORS, getIconComponent } from '../utils';

/* Map category ID → DQL filter value */
const CATEGORY_EVENT_MAP: Record<string, string> = {
  reachability: 'REACHABILITY',
  saturation: 'SATURATION',
  errors: 'ERRORS',
  traffic: 'TRAFFIC',
  global: '',
};

const SEV_COLOR = SEV_COLORS;

export const CategoryDetail = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { demoMode } = useDemoMode();
  const category = NETWORK_CATEGORIES.find((c) => c.id === categoryId);

  /* Filter alerts for this category */
  const eventCategory = CATEGORY_EVENT_MAP[categoryId ?? ''] ?? '';
  const filteredAlerts = useMemo(() => {
    const alerts = demoMode ? DEMO_ALERTS : [];
    if (!eventCategory) return alerts;
    return alerts.filter(a => a.category === eventCategory);
  }, [eventCategory, demoMode]);

  /* Live KPI */
  const kpiResult = useDql(
    { query: category?.kpi.dqlQuery ?? '' },
    { enabled: !demoMode && !!category },
  );
  const weekAgoResult = useDql(
    { query: category?.kpi.weekAgoDqlQuery ?? '' },
    { enabled: !demoMode && !!category },
  );
  const chartResult = useDql(
    { query: category?.chartQuery ?? '' },
    { enabled: !demoMode && !!category },
  );

  if (!category) {
    return (
      <Flex flexDirection="column" padding={32} gap={16}>
        <Heading level={2}>Category not found</Heading>
        <Paragraph>No category with ID "{categoryId}".</Paragraph>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </Flex>
    );
  }

  const catId = category.id as NetworkCategoryId;
  const field = category.kpi.fieldName;
  const kpiValue = demoMode
    ? toNum(DEMO_KPI[catId]?.[field])
    : toNum(kpiResult.data?.records?.[0]?.[field]);
  const kpiWeekAgo = demoMode
    ? toNum(DEMO_KPI_WEEK_AGO[catId]?.[field])
    : toNum(weekAgoResult.data?.records?.[0]?.[field]);
  const sev = computeSeverity(kpiValue, category.kpi.thresholds);

  const chartData = useMemo(() => {
    if (demoMode) return DEMO_CHART_DATA[catId];
    if (!chartResult.data?.records || !chartResult.data?.types) return null;
    try {
      return convertToTimeseries(chartResult.data.records, chartResult.data.types as any[]);
    } catch {
      return null;
    }
  }, [demoMode, chartResult.data, catId]);

  const deltaPercent = kpiWeekAgo > 0 ? ((kpiValue - kpiWeekAgo) / kpiWeekAgo * 100) : 0;
  const deltaLabel = `${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(0)}%`;

  const codeBlockStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 12,
    background: Colors.Background.Surface.Default,
    border: `1px solid ${Colors.Border.Neutral.Default}`,
    borderRadius: Borders.Radius.Container.Default,
    padding: 16,
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
  };

  const CategoryIcon = getIconComponent(category.icon);

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <Flex alignItems="center" gap={8}>
        <Button variant="default" onClick={() => navigate('/')}>← Back</Button>
        {CategoryIcon && <CategoryIcon />}
        <Heading level={2}>{category.title}</Heading>
        <span
          style={{
            marginLeft: 8,
            padding: '3px 10px',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700,
            background: `${SEV_COLOR[sev]}20`,
            color: SEV_COLOR[sev],
          }}
        >
          {sev.toUpperCase()}
        </span>
      </Flex>

      <Paragraph>{category.subtitle}</Paragraph>

      <Tabs defaultIndex={0}>
        {/* ── Overview ──────────────────── */}
        <Tab title="Overview">
          <Flex flexDirection="column" gap={20} paddingTop={16}>
            {/* KPI Hero */}
            <Flex gap={24} alignItems="stretch">
              <Flex
                flexDirection="column"
                gap={4}
                alignItems="center"
                justifyContent="center"
                style={{
                  padding: '24px 40px',
                  background: `${SEV_COLOR[sev]}10`,
                  border: `2px solid ${SEV_COLOR[sev]}40`,
                  borderRadius: Borders.Radius.Container.Default,
                  minWidth: 160,
                }}
              >
                <Paragraph style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>
                  {category.kpi.label}
                </Paragraph>
                <span style={{ fontSize: 42, fontWeight: 800, color: SEV_COLOR[sev], fontVariantNumeric: 'tabular-nums' }}>
                  {kpiValue}
                </span>
                <span style={{ fontSize: 12, opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>
                  vs. week ago: {kpiWeekAgo} ({deltaLabel})
                </span>
              </Flex>

              {category.secondaryKpi && (
                <Flex
                  flexDirection="column"
                  gap={4}
                  alignItems="center"
                  justifyContent="center"
                  style={{
                    padding: '24px 40px',
                    background: Colors.Background.Surface.Default,
                    border: `1px solid ${Colors.Border.Neutral.Default}`,
                    borderRadius: Borders.Radius.Container.Default,
                    minWidth: 160,
                  }}
                >
                  <Paragraph style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>
                    {category.secondaryKpi.label}
                  </Paragraph>
                  <span style={{ fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {demoMode
                      ? formatKpiValue(toNum(DEMO_SECONDARY_KPI[catId]?.[category.secondaryKpi.fieldName]), category.secondaryKpi.unit)
                      : '—'}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>
                    week ago: {demoMode
                      ? formatKpiValue(toNum(DEMO_SECONDARY_KPI_WEEK_AGO[catId]?.[category.secondaryKpi.fieldName]), category.secondaryKpi.unit)
                      : '—'}
                  </span>
                </Flex>
              )}
            </Flex>

            {/* Chart */}
            <Flex
              flexDirection="column"
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
                style={{
                  padding: '10px 20px',
                  borderBottom: `1px solid ${Colors.Border.Neutral.Default}`,
                }}
              >
                <Heading level={5} style={{ margin: 0 }}>
                  📊 {category.chartTitle ?? `${category.title} Trend`}
                </Heading>
                <Paragraph style={{ fontSize: 10, opacity: 0.5 }}>10-min bins</Paragraph>
              </Flex>
              <div style={{ padding: '8px 16px', height: 220 }}>
                {chartData ? (
                  <TimeseriesChart data={chartData as any} />
                ) : (
                  <Flex alignItems="center" justifyContent="center" style={{ height: '100%', opacity: 0.5 }}>
                    <Paragraph>Loading chart data…</Paragraph>
                  </Flex>
                )}
              </div>
            </Flex>
          </Flex>
        </Tab>

        {/* ── Alerts ───────────────────── */}
        <Tab title={`Alerts (${filteredAlerts.filter(a => a.status === 'ACTIVE').length})`}>
          <Flex flexDirection="column" gap={16} paddingTop={16}>
            <AlertList liveAlerts={demoMode ? filteredAlerts : undefined} />
          </Flex>
        </Tab>

        {/* ── KPI Query ────────────────── */}
        <Tab title="KPI Query">
          <Flex flexDirection="column" gap={16} paddingTop={16}>
            <Heading level={4}>Primary KPI — {category.kpi.label}</Heading>
            <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>Current window</Paragraph>
            <pre style={codeBlockStyle}>{category.kpi.dqlQuery}</pre>
            <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>Week-ago window</Paragraph>
            <pre style={codeBlockStyle}>{category.kpi.weekAgoDqlQuery}</pre>

            {category.secondaryKpi && (
              <>
                <Heading level={4}>Secondary KPI — {category.secondaryKpi.label}</Heading>
                <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>Current window</Paragraph>
                <pre style={codeBlockStyle}>{category.secondaryKpi.dqlQuery}</pre>
                <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>Week-ago window</Paragraph>
                <pre style={codeBlockStyle}>{category.secondaryKpi.weekAgoDqlQuery}</pre>
              </>
            )}
          </Flex>
        </Tab>

        {/* ── Chart Query ──────────────── */}
        <Tab title="Chart Query">
          <Flex flexDirection="column" gap={16} paddingTop={16}>
            <Heading level={4}>{category.chartTitle ?? `${category.title} Chart`}</Heading>
            <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>
              Chart type: {category.chartType} · Field: {category.chartField}
            </Paragraph>
            <pre style={codeBlockStyle}>{category.chartQuery}</pre>
          </Flex>
        </Tab>

        {/* ── Workflow Actions ──────────── */}
        <Tab title="Workflow Actions">
          <Flex flexDirection="column" gap={24} paddingTop={16}>
            <Paragraph style={{ fontSize: 13, opacity: 0.7 }}>
              Agentic AI workflows for {category.title}. Each action triggers an autonomous AI agent.
            </Paragraph>
            {category.actions.map((action) => (
              <Flex
                key={action.type}
                flexDirection="column"
                gap={8}
                style={{
                  padding: 16,
                  border: `1px solid ${Colors.Border.Neutral.Default}`,
                  borderRadius: Borders.Radius.Container.Default,
                  background: Colors.Background.Surface.Default,
                  boxShadow: BoxShadows.Surface.Raised.Rest,
                }}
              >
                <Flex alignItems="center" gap={8}>
                  {(() => { const I = getIconComponent(action.icon); return I ? <I /> : null; })()}
                  <Heading level={4}>{action.label}</Heading>
                </Flex>
                <Paragraph>{action.description}</Paragraph>
                <Paragraph style={{ fontSize: 12 }}>
                  <strong>Type:</strong> {action.type}
                </Paragraph>
                <Paragraph style={{ fontSize: 12 }}>
                  <strong>Workflow ID:</strong> {action.workflowId}
                </Paragraph>
                {action.params && (
                  <Paragraph style={{ fontSize: 12 }}>
                    <strong>Params:</strong> {JSON.stringify(action.params, null, 2)}
                  </Paragraph>
                )}
              </Flex>
            ))}
          </Flex>
        </Tab>
      </Tabs>
    </Flex>
  );
};
