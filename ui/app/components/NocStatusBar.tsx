import React, { useState, useEffect } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { SEV_COLORS } from '../utils';

export interface StatusCategory {
  icon: string;
  label: string;
  count: number;
  severity: 'critical' | 'warning' | 'healthy';
}

interface NocStatusBarProps {
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  categories: StatusCategory[];
}

export const NocStatusBar = ({
  totalAlerts,
  criticalCount,
  warningCount,
  healthyCount,
  categories,
}: NocStatusBarProps) => {
  /* Stable clock — updates every 30 s to avoid per-render recalculation */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Flex
      flexDirection="row"
      alignItems="center"
      gap={16}
      flexWrap="wrap"
      style={{
        padding: '12px 20px',
        background: Colors.Background.Surface.Default,
        borderRadius: Borders.Radius.Container.Default,
        border: `1px solid ${Colors.Border.Neutral.Default}`,
        boxShadow: BoxShadows.Surface.Raised.Rest,
      }}
    >
      {/* Total alerts */}
      <Flex flexDirection="column" alignItems="center" gap={2} style={{ minWidth: 80 }}>
        <Paragraph style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', opacity: 0.5, textTransform: 'uppercase' as const }}>
          Total Alerts
        </Paragraph>
        <Heading level={2} style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {totalAlerts}
        </Heading>
      </Flex>

      {/* Divider */}
      <div style={{ width: 1, height: 36, background: Colors.Border.Neutral.Default }} />

      {/* Severity breakdown */}
      <Flex gap={12} alignItems="center" flexWrap="wrap">
        <Flex alignItems="center" gap={6}>
          <div
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: SEV_COLORS.critical,
              boxShadow: criticalCount > 0 ? `0 0 6px ${SEV_COLORS.critical}` : 'none',
            }}
          />
          <Paragraph style={{ fontSize: 13, fontWeight: 700 }}>{criticalCount}</Paragraph>
          <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>Critical</Paragraph>
        </Flex>
        <Flex alignItems="center" gap={6}>
          <div
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: SEV_COLORS.warning,
              boxShadow: warningCount > 0 ? `0 0 6px ${SEV_COLORS.warning}` : 'none',
            }}
          />
          <Paragraph style={{ fontSize: 13, fontWeight: 700 }}>{warningCount}</Paragraph>
          <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>Warning</Paragraph>
        </Flex>
        <Flex alignItems="center" gap={6}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: SEV_COLORS.healthy }} />
          <Paragraph style={{ fontSize: 13, fontWeight: 700 }}>{healthyCount}</Paragraph>
          <Paragraph style={{ fontSize: 12, opacity: 0.6 }}>Healthy</Paragraph>
        </Flex>
      </Flex>

      {/* Divider */}
      <div style={{ width: 1, height: 36, background: Colors.Border.Neutral.Default }} />

      {/* Category pills */}
      <Flex gap={6} alignItems="center" flexWrap="wrap" style={{ flex: 1, minWidth: 0 }}>
        {categories.map((cat) => (
          <Flex
            key={cat.label}
            alignItems="center"
            gap={6}
            style={{
              padding: '5px 12px',
              borderRadius: 16,
              background: `${SEV_COLORS[cat.severity]}14`,
              border: `1px solid ${SEV_COLORS[cat.severity]}50`,
            }}
          >
            <span style={{ fontSize: 14 }}>{cat.icon}</span>
            <Paragraph style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {cat.count}
            </Paragraph>
            <Paragraph style={{ fontSize: 11, opacity: 0.6 }}>{cat.label}</Paragraph>
          </Flex>
        ))}
      </Flex>

      {/* Timestamp */}
      <Flex flexDirection="column" alignItems="flex-end" gap={2} style={{ minWidth: 100 }}>
        <Paragraph style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', opacity: 0.5, textTransform: 'uppercase' as const }}>
          Last Update
        </Paragraph>
        <Paragraph style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleTimeString()}
        </Paragraph>
      </Flex>
    </Flex>
  );
};
