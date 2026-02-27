import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { DeviceTable } from '../components/DeviceTable';
import { useDemoMode } from '../hooks/useDemoMode';

export const Devices = () => {
  const { demoMode } = useDemoMode();

  return (
    <Flex flexDirection="column" padding={24} gap={20}>
      <Flex alignItems="center" justifyContent="space-between">
        <Flex alignItems="center" gap={12}>
          <Heading level={3} style={{ margin: 0 }}>🖧 Network Devices</Heading>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.5px',
              background: demoMode
                ? 'rgba(99, 102, 241, 0.15)'
                : 'rgba(42, 176, 111, 0.15)',
              color: demoMode ? '#818cf8' : '#2ab06f',
            }}
          >
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
