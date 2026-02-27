import React, { useState, useMemo } from 'react';

import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import {
  RunQueryButton,
  type QueryStateType,
} from '@dynatrace/strato-components-preview/buttons';
import { TimeseriesChart } from '@dynatrace/strato-components-preview/charts';
import {
  convertToTimeseries,
  recommendVisualizations,
} from '@dynatrace/strato-components-preview/conversion-utilities';
import { DQLEditor } from '@dynatrace/strato-components-preview/editors';
import Colors from '@dynatrace/strato-design-tokens/colors';
import { CriticalIcon } from '@dynatrace/strato-icons';
import { useDql } from '@dynatrace-sdk/react-hooks';
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_CHART_DATA } from '../data/demoData';
import { modeBadgeStyle } from '../utils';

export const Data = () => {
  const { demoMode } = useDemoMode();
  const initialQuery =
    'fetch dt.entity.network:device\n| fieldsAdd device_name = entity.name\n| fieldsAdd tags\n| fieldsAdd lifetime\n| fieldsAdd management_zones\n| fieldsAdd detectedName\n| limit 50';

  const [editorQueryString, setEditorQueryString] = useState<string>(initialQuery);
  const [queryString, setQueryString] = useState<string>(initialQuery);

  const { data, error, isLoading, cancel, refetch } = useDql(
    { query: queryString },
    { enabled: !demoMode },
  );

  const recommendations = useMemo(
    () => recommendVisualizations(data?.records ?? [], data?.types ?? []),
    [data],
  );

  function onClickQuery() {
    if (demoMode) return;
    if (isLoading) {
      cancel();
    } else {
      if (queryString !== editorQueryString) setQueryString(editorQueryString);
      else refetch();
    }
  }

  let queryState: QueryStateType;
  if (demoMode) {
    queryState = 'success';
  } else if (error) {
    queryState = 'error';
  } else if (isLoading) {
    queryState = 'loading';
  } else if (data) {
    queryState = 'success';
  } else {
    queryState = 'idle';
  }

  /* In demo mode, show global chart data as a sample */
  const demoTimeseries = DEMO_CHART_DATA['global'];
  const showTimeseries = demoMode
    ? true
    : data?.records && recommendations.includes('TimeSeriesChart');

  return (
    <>
      <Flex flexDirection="column" alignItems="center" padding={32}>
        <Flex alignItems="center" gap={12}>
          <Heading level={2}>Explore Network Data</Heading>
          <span style={modeBadgeStyle(demoMode)}>
            {demoMode ? 'DEMO' : 'LIVE'}
          </span>
        </Flex>
        <Paragraph>
          {demoMode
            ? 'DQL editor is read-only in demo mode. Switch to Live to run queries.'
            : 'Use DQL to query network devices, interfaces, flow logs, and metrics.'}
        </Paragraph>
      </Flex>
      <Flex flexDirection="column" padding={32}>
        <DQLEditor
          value={editorQueryString}
          onChange={(event) => setEditorQueryString(event)}
        />
        <Flex justifyContent={error ? 'space-between' : 'flex-end'}>
          {error && (
            <Flex
              alignItems="center"
              style={{ color: Colors.Text.Critical.Default }}
            >
              <CriticalIcon />
              <Paragraph>{error.message}</Paragraph>
            </Flex>
          )}
          {!demoMode && !error && !data?.records && <Paragraph>no data available</Paragraph>}
          {!demoMode && !error &&
            data?.records &&
            !recommendations.includes('TimeSeriesChart') && (
              <Paragraph>use a query which has time series data</Paragraph>
            )}
          <RunQueryButton onClick={onClickQuery} queryState={queryState} />
        </Flex>
        {showTimeseries && (
          <TimeseriesChart
            data={
              demoMode
                ? (demoTimeseries as any)
                : convertToTimeseries(data!.records, data!.types)
            }
            gapPolicy="connect"
            variant="line"
          />
        )}
      </Flex>
    </>
  );
};
