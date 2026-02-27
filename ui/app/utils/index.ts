import type { ThresholdRule } from '../types/network';

/**
 * Shared utility functions for the Network Observability Console.
 *
 * Extracted to eliminate duplication across components/pages.
 */

/* ── Severity Colors ──────────────────────────────── */
export const SEV_COLORS: Record<'critical' | 'warning' | 'healthy', string> = {
  critical: '#dc172a',
  warning:  '#f5d30f',
  healthy:  '#2ab06f',
};

/* ── Evaluate threshold → severity ─────────────────── */
export function computeSeverity(
  value: number | undefined,
  thresholds: ThresholdRule[],
): 'critical' | 'warning' | 'healthy' {
  if (value == null) return 'healthy';
  for (const t of thresholds) {
    const v = Number(t.value);
    const match =
      (t.comparator === '==' && value === v) ||
      (t.comparator === '<' && value < v) ||
      (t.comparator === '<=' && value <= v) ||
      (t.comparator === '>' && value > v) ||
      (t.comparator === '>=' && value >= v);
    if (match) {
      return t.color === 'red'
        ? 'critical'
        : t.color === 'amber'
          ? 'warning'
          : 'healthy';
    }
  }
  return 'healthy';
}

/* ── DQL value coercion ───────────────────────────── */
export function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/* ── KPI value formatter (unit-aware) ─────────────── */
export function formatKpiValue(value: number, unit?: string): string {
  if (unit === 'ns') {
    const mins = Math.round(value / 60_000_000_000);
    if (mins < 1) return `${Math.round(value / 1_000_000_000)}s`;
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'Gbps') return `${value.toFixed(1)} Gbps`;
  return value.toLocaleString();
}

/* ── Traffic formatter ────────────────────────────── */
export function formatTraffic(gbps: number): string {
  if (gbps >= 1) return `${gbps.toFixed(1)} Gbps`;
  return `${(gbps * 1000).toFixed(0)} Mbps`;
}

/* ── Percent bar component helper ─────────────────── */
export function percentBarColor(value: number, warn = 60, crit = 80): string {
  if (value >= crit) return '#dc172a';
  if (value >= warn) return '#fd8232';
  return '#2ab06f';
}

/* ── Duration formatter ───────────────────────────── */
export function formatDuration(mins: number): string {
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

/* ── Demo/Live badge styles ───────────────────────── */
export const modeBadgeStyle = (demoMode: boolean): React.CSSProperties => ({
  padding: '3px 10px',
  borderRadius: 10,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.5px',
  background: demoMode
    ? 'rgba(99, 102, 241, 0.15)'
    : 'rgba(42, 176, 111, 0.15)',
  color: demoMode ? '#818cf8' : '#2ab06f',
});
