import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { TopologyMap } from '../components/TopologyMap';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTopologyData } from '../hooks/useTopologyData';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { modeBadgeStyle } from '../utils';

export const Topology = () => {
  const { demoMode } = useDemoMode();
  const { nodes, edges, edgeCounts, isLoading, error } = useTopologyData(960, 600);

  return (
    <Flex flexDirection="column" padding={24} gap={20}>
      {/* Header */}
      <Flex alignItems="center" justifyContent="space-between">
        <Flex alignItems="center" gap={12}>
          <Heading level={3} style={{ margin: 0 }}>🗺️ Network Topology</Heading>
          <span style={modeBadgeStyle(demoMode)}>
            {demoMode ? 'DEMO' : 'LIVE'}
          </span>
        </Flex>
        <Paragraph style={{ fontSize: 11, opacity: 0.5 }}>
          Interactive topology — hover nodes for details
          {!demoMode && nodes.length > 0 && ` • ${nodes.length} devices`}
        </Paragraph>
      </Flex>

      {/* Full topology map */}
      <TopologyMap nodes={nodes} edges={edges} edgeCounts={edgeCounts} height={600} isLoading={isLoading} error={error} />

      {/* Utilization legend */}
      <Flex
        gap={32}
        alignItems="center"
        justifyContent="center"
        style={{
          padding: '12px 24px',
          background: Colors.Background.Surface.Default,
          borderRadius: Borders.Radius.Container.Default,
          border: `1px solid ${Colors.Border.Neutral.Default}`,
          boxShadow: BoxShadows.Surface.Raised.Rest,
        }}
      >
        <Paragraph style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>
          Link Utilization:
        </Paragraph>
        {[
          { label: '< 60%', color: '#2ab06f' },
          { label: '60–80%', color: '#fd8232' },
          { label: '> 80%', color: '#dc172a' },
        ].map(({ label, color }) => (
          <Flex key={label} alignItems="center" gap={6}>
            <span
              style={{
                display: 'inline-block',
                width: 24, height: 3,
                borderRadius: 2,
                background: color,
              }}
            />
            <Paragraph style={{ fontSize: 11 }}>{label}</Paragraph>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
};
