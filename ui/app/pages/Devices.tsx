import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { DeviceTable } from '../components/DeviceTable';
import { useDemoMode } from '../hooks/useDemoMode';
import { modeBadgeStyle } from '../utils';

export const Devices = () => {
  const { demoMode } = useDemoMode();

  return (
    <Flex flexDirection="column" padding={24} gap={20}>
      <Flex alignItems="center" justifyContent="space-between">
        <Flex alignItems="center" gap={12}>
          <Heading level={3} style={{ margin: 0 }}>🖧 Network Devices</Heading>
          <span style={modeBadgeStyle(demoMode)}>
            {demoMode ? 'DEMO' : 'LIVE'}
          </span>
        </Flex>
        <Paragraph style={{ fontSize: 11, opacity: 0.5 }}>
          Device inventory with resource utilization
        </Paragraph>
      </Flex>

      <DeviceTable />
    </Flex>
  );
};
