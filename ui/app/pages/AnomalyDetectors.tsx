import React, { useState, useMemo } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';

import { useDemoMode } from '../hooks/useDemoMode';
import {
  ANOMALY_DETECTORS,
  ANOMALY_CATEGORY_META,
  SEVERITY_META,
  DEMO_DETECTOR_STATUSES,
} from '../data/anomalyDetectors';
import type {
  AnomalyDetectorRule,
  AnomalyDetectorCategory,
  AnomalyDetectorStatus,
} from '../types/network';
import { modeBadgeStyle } from '../utils';

/* ── Style helpers ─────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: Colors.Background.Surface.Default,
  border: `1px solid ${Colors.Border.Neutral.Default}`,
  boxShadow: BoxShadows.Surface.Raised.Rest,
  borderRadius: Borders.Radius.Container.Default,
  padding: 20,
};

const badgeBase: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.5px',
  lineHeight: '18px',
};

const tagStyle: React.CSSProperties = {
  ...badgeBase,
  background: 'rgba(115,177,255,0.12)',
  color: '#73b1ff',
};

const codeBlock: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  fontSize: 12,
  lineHeight: 1.5,
  background: 'rgba(0,0,0,0.25)',
  borderRadius: 6,
  padding: '12px 16px',
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
};

const firingDot = (status: string): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: status === 'FIRING' ? '#dc172a' : status === 'DISABLED' ? '#9e9e9e' : '#2ab06f',
  display: 'inline-block',
  marginRight: 6,
  animation: status === 'FIRING' ? 'detectorPulse 1.5s ease-in-out infinite' : undefined,
});

/* ── Pulse animation ───────────────────────────────── */
const pulseKeyframes = `
@keyframes detectorPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220,23,42,0.0); }
  50%      { box-shadow: 0 0 8px 2px rgba(220,23,42,0.35); }
}
`;

/* ── Component ─────────────────────────────────────── */
export const AnomalyDetectors = () => {
  const { demoMode } = useDemoMode();
  const [expandedDetector, setExpandedDetector] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<AnomalyDetectorCategory | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  /* Build status lookup from demo data */
  const statusMap = useMemo(() => {
    const m = new Map<string, AnomalyDetectorStatus>();
    if (demoMode) {
      DEMO_DETECTOR_STATUSES.forEach((s) => m.set(s.detectorId, s));
    }
    return m;
  }, [demoMode]);

  /* Group detectors by category */
  const grouped = useMemo(() => {
    const map = new Map<AnomalyDetectorCategory, AnomalyDetectorRule[]>();
    for (const d of ANOMALY_DETECTORS) {
      if (filterCategory !== 'all' && d.category !== filterCategory) continue;
      if (filterSeverity !== 'all' && d.severity !== filterSeverity) continue;
      if (!map.has(d.category)) map.set(d.category, []);
      map.get(d.category)!.push(d);
    }
    return map;
  }, [filterCategory, filterSeverity]);

  /* Summary counts */
  const totalDetectors = ANOMALY_DETECTORS.length;
  const firingCount = demoMode
    ? DEMO_DETECTOR_STATUSES.filter((s) => s.status === 'FIRING').length
    : 0;
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of ANOMALY_DETECTORS) {
      counts[d.category] = (counts[d.category] || 0) + 1;
    }
    return counts;
  }, []);

  return (
    <>
      <style>{pulseKeyframes}</style>
      <Flex flexDirection="column" gap={24} padding={32}>
        {/* ── Page header ─────────────────────────── */}
        <Flex flexDirection="row" justifyContent="space-between" alignItems="center">
          <Flex flexDirection="column" gap={4}>
            <Heading level={1}>🔔 Anomaly Detectors</Heading>
            <Paragraph>
              Davis anomaly detection rules for network observability — {totalDetectors} detectors across{' '}
              {Object.keys(ANOMALY_CATEGORY_META).length} categories
            </Paragraph>
          </Flex>
          <span style={modeBadgeStyle(demoMode)}>{demoMode ? 'DEMO' : 'LIVE'}</span>
        </Flex>

        {/* ── Summary strip ───────────────────────── */}
        <Flex flexDirection="row" gap={12} flexWrap="wrap">
          {/* Firing count */}
          {demoMode && (
            <div
              style={{
                ...cardStyle,
                padding: '12px 20px',
                borderLeft: '4px solid #dc172a',
                minWidth: 140,
              }}
            >
              <div style={{ fontSize: 11, color: '#bbb', marginBottom: 4 }}>
                CURRENTLY FIRING
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#dc172a' }}>
                {firingCount}
              </div>
            </div>
          )}
          {/* Per-category counts */}
          {(Object.keys(ANOMALY_CATEGORY_META) as AnomalyDetectorCategory[]).map((cat) => {
            const meta = ANOMALY_CATEGORY_META[cat];
            const count = categoryCounts[cat] || 0;
            const isActive = filterCategory === cat;
            return (
              <div
                key={cat}
                onClick={() => setFilterCategory(isActive ? 'all' : cat)}
                style={{
                  ...cardStyle,
                  padding: '12px 20px',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${meta.color}`,
                  opacity: filterCategory !== 'all' && !isActive ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                  minWidth: 130,
                }}
              >
                <div style={{ fontSize: 11, color: '#bbb', marginBottom: 4 }}>
                  {meta.icon} {meta.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: meta.color }}>
                  {count}
                </div>
              </div>
            );
          })}
        </Flex>

        {/* ── Severity filter ─────────────────────── */}
        <Flex flexDirection="row" gap={8} alignItems="center">
          <span style={{ fontSize: 12, color: '#bbb', marginRight: 4 }}>Severity:</span>
          {['all', 'critical', 'major', 'minor', 'info'].map((sev) => {
            const isActive = filterSeverity === sev;
            const meta = sev !== 'all' ? SEVERITY_META[sev] : undefined;
            return (
              <span
                key={sev}
                onClick={() => setFilterSeverity(isActive ? 'all' : sev)}
                style={{
                  ...badgeBase,
                  cursor: 'pointer',
                  background: meta?.bg ?? (isActive ? 'rgba(255,255,255,0.1)' : 'transparent'),
                  color: meta?.color ?? '#ccc',
                  border: isActive
                    ? `1px solid ${meta?.color ?? '#888'}`
                    : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {sev === 'all' ? 'All' : (meta?.label ?? sev)}
              </span>
            );
          })}
        </Flex>

        {/* ── Detector groups ─────────────────────── */}
        {Array.from(grouped.entries()).map(([category, detectors]) => {
          const catMeta = ANOMALY_CATEGORY_META[category];
          return (
            <Flex key={category} flexDirection="column" gap={12}>
              {/* Category header */}
              <Heading level={3} style={{ color: catMeta.color }}>
                {catMeta.icon} {catMeta.label}
                <span style={{ fontSize: 14, fontWeight: 400, color: '#999', marginLeft: 8 }}>
                  ({detectors.length} detector{detectors.length > 1 ? 's' : ''})
                </span>
              </Heading>

              {/* Detector rows */}
              {detectors.map((det) => {
                const isExpanded = expandedDetector === det.id;
                const status = statusMap.get(det.id);
                const sevMeta = SEVERITY_META[det.severity];

                return (
                  <div
                    key={det.id}
                    style={{
                      ...cardStyle,
                      cursor: 'pointer',
                      borderLeft: `4px solid ${sevMeta.color}`,
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setExpandedDetector(isExpanded ? null : det.id)}
                  >
                    {/* Row header */}
                    <Flex flexDirection="row" justifyContent="space-between" alignItems="center">
                      <Flex flexDirection="row" alignItems="center" gap={12}>
                        {/* Status dot */}
                        {demoMode && status && (
                          <span style={firingDot(status.status)} title={status.status} />
                        )}
                        {/* Title */}
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{det.title}</span>
                        {/* Severity badge */}
                        <span
                          style={{
                            ...badgeBase,
                            background: sevMeta.bg,
                            color: sevMeta.color,
                          }}
                        >
                          {sevMeta.label}
                        </span>
                        {/* Enabled */}
                        {!det.enabled && (
                          <span
                            style={{
                              ...badgeBase,
                              background: 'rgba(158,158,158,0.15)',
                              color: '#9e9e9e',
                            }}
                          >
                            DISABLED
                          </span>
                        )}
                      </Flex>

                      {/* Right side: threshold summary + firing info */}
                      <Flex flexDirection="row" alignItems="center" gap={16}>
                        <span style={{ fontSize: 12, color: '#999' }}>
                          {det.alertCondition} {det.threshold} &bull; {det.violatingSamples}/{det.slidingWindow} samples
                        </span>
                        {demoMode && status?.status === 'FIRING' && (
                          <span
                            style={{
                              ...badgeBase,
                              background: 'rgba(220,23,42,0.12)',
                              color: '#dc172a',
                            }}
                          >
                            🔥 {status.firingCount} active
                          </span>
                        )}
                        <span style={{ fontSize: 14, color: '#666' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </Flex>
                    </Flex>

                    {/* Description (always visible) */}
                    <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                      {det.description}
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ marginTop: 16 }}>
                        {/* Config grid */}
                        <Flex flexDirection="row" gap={24} flexWrap="wrap" style={{ marginBottom: 16 }}>
                          <ConfigItem label="Threshold" value={`${det.alertCondition} ${det.threshold}`} />
                          <ConfigItem label="Alert Condition" value={det.alertCondition} />
                          <ConfigItem label="Sliding Window" value={`${det.slidingWindow} samples`} />
                          <ConfigItem label="Violating Samples" value={`${det.violatingSamples}`} />
                          <ConfigItem label="De-alerting Samples" value={`${det.dealertingSamples}`} />
                          <ConfigItem label="Event Merging" value={det.isMergingAllowed ? 'Allowed' : 'Not allowed'} />
                        </Flex>

                        {/* Related categories */}
                        <Flex flexDirection="row" gap={6} alignItems="center" style={{ marginBottom: 12 }}>
                          <span style={{ fontSize: 11, color: '#888' }}>MAPS TO:</span>
                          {det.relatedCategories.map((rc) => (
                            <span key={rc} style={tagStyle}>
                              {rc}
                            </span>
                          ))}
                        </Flex>

                        {/* Event template */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>
                            EVENT TEMPLATE
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                            {det.eventTitlePattern}
                          </div>
                          <div style={{ fontSize: 12, color: '#bbb' }}>
                            {det.eventDescriptionPattern}
                          </div>
                        </div>

                        {/* DQL Query */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>
                            DQL QUERY
                          </div>
                          <pre style={codeBlock}>{det.query}</pre>
                        </div>

                        {/* NOC Guidance */}
                        <div
                          style={{
                            background: 'rgba(42,176,111,0.08)',
                            border: '1px solid rgba(42,176,111,0.25)',
                            borderRadius: 6,
                            padding: '12px 16px',
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#2ab06f', marginBottom: 4 }}>
                            💡 NOC GUIDANCE
                          </div>
                          <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
                            {det.nocGuidance}
                          </div>
                        </div>

                        {/* Demo status detail */}
                        {demoMode && status?.lastFired && (
                          <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                            Last fired: {status.lastFired.toLocaleTimeString()} &bull;{' '}
                            {status.firingCount} active event{status.firingCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </Flex>
          );
        })}

        {/* Empty state */}
        {grouped.size === 0 && (
          <Flex justifyContent="center" alignItems="center" style={{ padding: 64 }}>
            <Paragraph style={{ color: '#666' }}>
              No detectors match the current filter. Adjust the category or severity filter above.
            </Paragraph>
          </Flex>
        )}
      </Flex>
    </>
  );
};

/* ── Small config item ─────────────────────────────── */
const ConfigItem = ({ label, value }: { label: string; value: string }) => (
  <div style={{ minWidth: 120 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: '#666', marginBottom: 2 }}>
      {label.toUpperCase()}
    </div>
    <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
  </div>
);
