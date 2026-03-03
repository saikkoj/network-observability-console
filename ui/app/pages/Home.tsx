/**
 * Home — Redesigned NOC overview (simplified).
 *
 * Layout:
 * 1. Header: title + mode badge + SegmentSelector
 * 2. FilterBar: device multi-select + top-limit selector
 * 3. Two maps side by side: geo map (left) + unmapped devices (right)
 * 4. Active network alerts (under maps)
 * 5. Dashboard tabs: "Generic Overview" + "Network Devices"
 *
 * Dynatrace Segments apply automatically to all useDql() calls.
 * Device filter + TopLimit are passed as props to tab pages.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { Tabs, Tab } from '@dynatrace/strato-components-preview/navigation';
import { SegmentSelector } from '@dynatrace/strato-components-preview/filters';
import { FilterBar } from '@dynatrace/strato-components-preview/filters';
import { Select } from '@dynatrace/strato-components-preview/forms';
import { useDql } from '@dynatrace-sdk/react-hooks';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';

import { useDemoMode } from '../hooks/useDemoMode';
import { useClusterData } from '../hooks/useClusterData';
import { ClusterMap } from '../components/ClusterMap';
import { UnmappedDevices } from '../components/UnmappedDevices';
import { AlertList } from '../components/AlertList';
import { GenericOverview } from './GenericOverview';
import { NetworkDevicesPerf } from './NetworkDevicesPerf';
import { modeBadgeStyle } from '../utils';
import { WorldmapIcon, RefreshIcon } from '@dynatrace/strato-icons';

const MAP_HEIGHT = 420;

/** DQL to populate the device name selector */
const Q_DEVICE_NAMES = `fetch \`dt.entity.network:device\`
| summarize name = collectDistinct(entity.name)
| expand name
| fieldsAdd name = coalesce(name, "*")
| sort name ASC`;

const TOP_LIMIT_OPTIONS = ['3', '10', '25', '50', '100', '500', '1000'];

export const Home = () => {
  const { demoMode } = useDemoMode();
  const { regions, totalEntities } = useClusterData();
  const navigate = useNavigate();

  /* ── Device name selector state (draft = pending, applied = committed) ── */
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [topLimit, setTopLimit] = useState<number>(10);
  const [appliedDevices, setAppliedDevices] = useState<string[]>([]);
  const [appliedTopLimit, setAppliedTopLimit] = useState<number>(10);

  /** True when the draft differs from the applied filter */
  const filterDirty = useMemo(() => {
    if (topLimit !== appliedTopLimit) return true;
    if (selectedDevices.length !== appliedDevices.length) return true;
    return selectedDevices.some((d, i) => d !== appliedDevices[i]);
  }, [selectedDevices, appliedDevices, topLimit, appliedTopLimit]);

  const applyFilter = useCallback(() => {
    setAppliedDevices([...selectedDevices]);
    setAppliedTopLimit(topLimit);
  }, [selectedDevices, topLimit]);

  /* Fetch device names for the selector */
  const deviceNamesResult = useDql({ query: Q_DEVICE_NAMES }, { enabled: !demoMode });
  const deviceNameOptions = useMemo(() => {
    if (!deviceNamesResult.data?.records) return [];
    return deviceNamesResult.data.records
      .map((r: Record<string, unknown>) => String(r['name'] ?? ''))
      .filter(Boolean);
  }, [deviceNamesResult.data]);

  /* ── Map drill-down → navigate to topology page with region context ── */
  const handleRegionClick = useCallback(
    (regionId: string) => {
      navigate('/topology', { state: { regionId } });
    },
    [navigate],
  );

  return (
    <Flex
      flexDirection="column"
      padding={24}
      gap={20}
      style={{ overflow: 'hidden', scrollbarGutter: 'stable', minWidth: 0 }}
    >
      {/* ── Title row ── */}
      <Flex alignItems="center" gap={12}>
        <Heading level={3} style={{ margin: 0 }}>
          Network Observability Console
        </Heading>
        <span style={modeBadgeStyle(demoMode)}>
          {demoMode ? 'DEMO' : 'LIVE'}
        </span>
      </Flex>

      {/* ── Toolbar: all selectors on one anchored row ── */}
      <Flex
        alignItems="flex-end"
        gap={16}
        flexWrap="wrap"
        style={{ minHeight: 40 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <SegmentSelector />
        </div>

        <FilterBar onFilterChange={() => { /* state managed via controlled components */ }}>
          <FilterBar.Item name="devices" label="Devices">
            <Select
              multiple
              value={selectedDevices}
              onChange={(vals: string[] | null) => setSelectedDevices(vals ?? [])}
              clearable
            >
              <Select.Content>
                {deviceNameOptions.map((name: string) => (
                  <Select.Option key={name} value={name}>
                    {name}
                  </Select.Option>
                ))}
              </Select.Content>
            </Select>
          </FilterBar.Item>
          <FilterBar.Item name="topLimit" label="Top N">
            <Select
              value={String(topLimit)}
              onChange={(val: string | null) => setTopLimit(val ? parseInt(val, 10) : 10)}
            >
              <Select.Content>
                {TOP_LIMIT_OPTIONS.map((n) => (
                  <Select.Option key={n} value={n}>
                    {n}
                  </Select.Option>
                ))}
              </Select.Content>
            </Select>
          </FilterBar.Item>
        </FilterBar>

        <Button
          variant="accent"
          color="primary"
          onClick={applyFilter}
          disabled={!filterDirty}
        >
          <Button.Prefix><RefreshIcon /></Button.Prefix>
          Refresh
        </Button>
      </Flex>

      {/* ── Two maps side by side ── */}
      <Flex gap={16} alignItems="stretch" style={{ minWidth: 0 }}>
        {/* Left: Geographic cluster map */}
        <div style={{ flex: 3, minWidth: 0, overflow: 'hidden' }}>
          <Flex
            alignItems="center"
            justifyContent="space-between"
            style={{
              padding: '10px 16px',
              background: Colors.Background.Surface.Default,
              borderRadius: `${Borders.Radius.Container.Default} ${Borders.Radius.Container.Default} 0 0`,
              border: `1px solid ${Colors.Border.Neutral.Default}`,
              borderBottom: 'none',
            }}
          >
            <Flex alignItems="center" gap={8}>
              <WorldmapIcon />
              <Heading level={6} style={{ margin: 0 }}>Network Map</Heading>
            </Flex>
            <Paragraph style={{ fontSize: 11, opacity: 0.5 }}>
              Devices with geographic location
            </Paragraph>
          </Flex>
          <ClusterMap
            regions={regions}
            height={MAP_HEIGHT}
            mini={false}
            onRegionClick={handleRegionClick}
          />
        </div>

        {/* Right: Unmapped devices */}
        <div style={{ flex: 2, minWidth: 280 }}>
          <UnmappedDevices height={MAP_HEIGHT + 42 /* match header height */} />
        </div>
      </Flex>

      {/* ── Active Alerts (under maps) ── */}
      <AlertList />

      {/* ── Dashboard Query Tabs ── */}
      <div
        style={{
          background: Colors.Background.Surface.Default,
          border: `1px solid ${Colors.Border.Neutral.Default}`,
          borderRadius: Borders.Radius.Container.Default,
          boxShadow: BoxShadows.Surface.Raised.Rest,
          padding: 16,
        }}
      >
        <Tabs defaultIndex={0}>
          <Tab title="Generic Overview">
            <div style={{ paddingTop: 16 }}>
              <GenericOverview deviceFilter={appliedDevices} topLimit={appliedTopLimit} />
            </div>
          </Tab>
          <Tab title="Network Devices">
            <div style={{ paddingTop: 16 }}>
              <NetworkDevicesPerf deviceFilter={appliedDevices} topLimit={appliedTopLimit} />
            </div>
          </Tab>
        </Tabs>
      </div>
    </Flex>
  );
};
