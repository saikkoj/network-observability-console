import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { Link } from 'react-router-dom';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';

import type { NetworkCategory } from '../types/network';
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_KPI, DEMO_SECONDARY_KPI } from '../data/demoData';
import { useDql } from '@dynatrace-sdk/react-hooks';
import { computeSeverity, toNum, SEV_COLORS, getIconComponent } from '../utils';

/* ── Single mini card ──────────────────────────────── */
const KpiMiniCard = ({ category }: { category: NetworkCategory }) => {
  const { demoMode } = useDemoMode();

  const kpiResult = useDql(
    { query: category.kpi.dqlQuery },
    { enabled: !demoMode },
  );

  const nowValue = demoMode
    ? DEMO_KPI[category.id]?.[category.kpi.fieldName]
    : toNum((kpiResult.data?.records?.[0] as Record<string, unknown>)?.[category.kpi.fieldName]);

  const secKpi = category.secondaryKpi;
  const secResult = useDql(
    { query: secKpi?.dqlQuery ?? '' },
    { enabled: !demoMode && !!secKpi },
  );
  const secValue = secKpi
    ? demoMode
      ? DEMO_SECONDARY_KPI[category.id]?.[secKpi.fieldName]
      : toNum((secResult.data?.records?.[0] as Record<string, unknown>)?.[secKpi.fieldName])
    : undefined;

  const severity = computeSeverity(nowValue, category.kpi.thresholds);
  const sevColor = SEV_COLORS[severity];

  const formatValue = (val: number | undefined, unit?: string): string => {
    if (val == null) return '—';
    if (unit === 'Gbps') return `${val.toFixed(1)}`;
    if (unit === '%') return `${val.toFixed(1)}%`;
    return val.toLocaleString();
  };

  return (
    <Link
      to={`/category/${category.id}`}
      style={{ textDecoration: 'none', color: 'inherit', minWidth: 0 }}
    >
      <Flex
        flexDirection="column"
        alignItems="center"
        gap={4}
        style={{
          padding: '12px 8px',
          background: Colors.Background.Surface.Default,
          borderRadius: Borders.Radius.Container.Default,
          border: `1px solid ${Colors.Border.Neutral.Default}`,
          borderTop: `3px solid ${sevColor}`,
          boxShadow: BoxShadows.Surface.Raised.Rest,
          transition: 'box-shadow 0.2s, border-color 0.2s',
          cursor: 'pointer',
          minWidth: 0,
        }}
      >
        <Flex alignItems="center" gap={6}>
          {(() => { const I = getIconComponent(category.icon); return I ? <I /> : null; })()}
          <Paragraph style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {category.title}
          </Paragraph>
        </Flex>
        <Heading
          level={3}
          style={{
            margin: 0,
            fontVariantNumeric: 'tabular-nums',
            color: sevColor,
            lineHeight: 1,
          }}
        >
          {formatValue(nowValue, category.kpi.unit)}
        </Heading>
        <Paragraph style={{ fontSize: 10, opacity: 0.5 }}>
          {category.kpi.label}
        </Paragraph>
        {secValue != null && secKpi && (
          <Paragraph style={{ fontSize: 10, opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>
            {secKpi.label}: {formatValue(secValue, secKpi.unit)}
          </Paragraph>
        )}
      </Flex>
    </Link>
  );
};

/* ── KPI Strip — full horizontal row ───────────────── */
interface KpiStripProps {
  categories: NetworkCategory[];
}

export const KpiStrip = ({ categories }: KpiStripProps) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 12,
      minWidth: 0,
    }}>
      {categories.map(cat => (
        <KpiMiniCard key={cat.id} category={cat} />
      ))}
    </div>
  );
};
