import type { ThresholdRule } from '../types/network';
import { sendIntent, getAppLink } from '@dynatrace-sdk/navigation';
import {
  AiIcon,
  DocumentIcon,
  ArrowUpIcon,
  ListIcon,
  CallIcon,
  EditIcon,
  MuteIcon,
  RepairIcon,
  BarChartIcon,
  MagnifyingGlassIcon,
  SyncIcon,
  CheckmarkIcon,
  WorldmapIcon,
  NetworkDevicesIcon,
  AnalyticsIcon,
  CriticalIcon,
  NetworkIcon,
  NotificationActiveIcon,
  OpenWithIcon,
  LinkIcon,
  ActionIcon,
} from '@dynatrace/strato-icons';

/**
 * Shared utility functions for the Network Observability Console.
 *
 * Extracted to eliminate duplication across components/pages.
 */

/* ── Icon Map — maps string keys to Strato icon components ── */
export const ICON_MAP: Record<string, React.ComponentType> = {
  ai: AiIcon,
  document: DocumentIcon,
  'arrow-up': ArrowUpIcon,
  list: ListIcon,
  call: CallIcon,
  edit: EditIcon,
  mute: MuteIcon,
  repair: RepairIcon,
  'bar-chart': BarChartIcon,
  search: MagnifyingGlassIcon,
  sync: SyncIcon,
  checkmark: CheckmarkIcon,
  world: WorldmapIcon,
  'network-devices': NetworkDevicesIcon,
  analytics: AnalyticsIcon,
  critical: CriticalIcon,
  network: NetworkIcon,
  notification: NotificationActiveIcon,
  'open-with': OpenWithIcon,
  link: LinkIcon,
  action: ActionIcon,
};

/** Get a Strato icon component by key. Returns null if key is unknown. */
export function getIconComponent(key: string): React.ComponentType | null {
  return ICON_MAP[key] ?? null;
}

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

/* ── Open DQL query via intent (platform shows picker: Notebooks, Logs, etc.) ── */
export function openQueryIntent(query: string): void {
  try {
    sendIntent({ 'dt.query': query });
  } catch {
    /* silently ignore if no app handles the intent */
  }
}

/* ── Deep-link helpers ── */

/**
 * Build a full URL to another Dynatrace app.
 *
 * Uses the SDK's getAppLink() to get the shell-resolved base for a known app,
 * then derives the environment origin from that.
 *
 * getAppLink('dynatrace.infraops') returns something like:
 *   /ui/openApp/dynatrace.infraops     — or —
 *   https://acc27517.dev.apps.dynatracelabs.com/ui/apps/dynatrace.infraops
 *
 * We only need the origin portion, then build the correct /ui/apps/... path.
 */
function getEnvOrigin(): string {
  try {
    // getAppLink returns the shell-resolved URL for any app
    const link = getAppLink('dynatrace.infraops');
    // If it's a full URL, extract origin
    if (link.startsWith('http')) {
      const url = new URL(link);
      return url.origin;
    }
  } catch { /* */ }

  // Fallback: strip our app path from the current page URL
  const href = window.location.href;
  const appMarker = '/ui/apps/my.network.observability.console';
  const idx = href.indexOf(appMarker);
  if (idx !== -1) return href.substring(0, idx);

  // Last resort: use current origin
  return window.location.origin;
}

/** Build a full absolute URL to the InfraOps device Health page. */
export function getDeviceUrl(entityId: string): string {
  return `${getEnvOrigin()}/ui/apps/dynatrace.infraops/explorer/Network%20devices?perspective=Health&fullPageId=${encodeURIComponent(entityId)}`;
}

/** Open the InfraOps device detail page in a new browser tab. */
export function openDeviceDetail(entityId: string): void {
  try { window.open(getDeviceUrl(entityId), '_blank', 'noopener'); } catch { /* */ }
}

/** Build a full absolute URL to the Davis Problems detail page. */
export function getProblemUrl(problemId: string): string {
  return `${getEnvOrigin()}/ui/apps/dynatrace.davis.problems/problem/${encodeURIComponent(problemId)}?from=now%28%29-2h&to=now%28%29`;
}

/** Open the problem detail page in a new browser tab. */
export function openProblemDetail(problemId: string): void {
  try { window.open(getProblemUrl(problemId), '_blank', 'noopener'); } catch { /* */ }
}

/* ── Location-to-city mapping ── */
/**
 * Maps a devSysLocation / extCfgGroupLabel string from SNMP entities
 * to a human-readable city name. Uses common IATA codes, city prefixes,
 * and keyword matching. Falls back to the raw string if unrecognised.
 */
const LOCATION_MAP: Array<{ pattern: RegExp; city: string }> = [
  // IATA / common prefix codes
  { pattern: /\bLON\b/i,   city: 'London' },
  { pattern: /\bHEL\b/i,   city: 'Helsinki' },
  { pattern: /\bNYC\b/i,   city: 'New York' },
  { pattern: /\bSFO\b/i,   city: 'San Francisco' },
  { pattern: /\bLAX\b/i,   city: 'Los Angeles' },
  { pattern: /\bFRA\b/i,   city: 'Frankfurt' },
  { pattern: /\bAMS\b/i,   city: 'Amsterdam' },
  { pattern: /\bSIN\b/i,   city: 'Singapore' },
  { pattern: /\bTYO\b/i,   city: 'Tokyo' },
  { pattern: /\bSYD\b/i,   city: 'Sydney' },
  { pattern: /\bDUB\b/i,   city: 'Dublin' },
  { pattern: /\bPAR\b/i,   city: 'Paris' },
  { pattern: /\bBER\b/i,   city: 'Berlin' },
  { pattern: /\bMUC\b/i,   city: 'Munich' },
  { pattern: /\bTMP\b/i,   city: 'Tampere' },
  { pattern: /\bOUL\b/i,   city: 'Oulu' },
  { pattern: /\bTKU\b/i,   city: 'Turku' },
  { pattern: /\bROV\b/i,   city: 'Rovaniemi' },
  { pattern: /\bJYV\b/i,   city: 'Jyväskylä' },
  { pattern: /\bKUO\b/i,   city: 'Kuopio' },
  // Full city name keywords
  { pattern: /london/i,     city: 'London' },
  { pattern: /helsinki/i,   city: 'Helsinki' },
  { pattern: /new york/i,   city: 'New York' },
  { pattern: /san francisco/i, city: 'San Francisco' },
  { pattern: /los angeles/i, city: 'Los Angeles' },
  { pattern: /frankfurt/i,  city: 'Frankfurt' },
  { pattern: /amsterdam/i,  city: 'Amsterdam' },
  { pattern: /singapore/i,  city: 'Singapore' },
  { pattern: /tokyo/i,      city: 'Tokyo' },
  { pattern: /sydney/i,     city: 'Sydney' },
  { pattern: /dublin/i,     city: 'Dublin' },
  { pattern: /paris/i,      city: 'Paris' },
  { pattern: /berlin/i,     city: 'Berlin' },
  { pattern: /munich/i,     city: 'Munich' },
  { pattern: /tampere/i,    city: 'Tampere' },
  { pattern: /oulu/i,       city: 'Oulu' },
  { pattern: /turku/i,      city: 'Turku' },
  { pattern: /rovaniemi/i,  city: 'Rovaniemi' },
  { pattern: /jyv[aä]skyl[aä]/i, city: 'Jyväskylä' },
  { pattern: /kuopio/i,     city: 'Kuopio' },
  { pattern: /espoo/i,      city: 'Espoo' },
  { pattern: /vantaa/i,     city: 'Vantaa' },
  { pattern: /pasila/i,     city: 'Helsinki' },
  { pattern: /keilaniemi/i, city: 'Espoo' },
  // Data center keywords (AWS regions)
  { pattern: /eu-west-1/i,  city: 'Dublin' },
  { pattern: /eu-west-2/i,  city: 'London' },
  { pattern: /eu-central-1/i, city: 'Frankfurt' },
  { pattern: /eu-north-1/i, city: 'Stockholm' },
  { pattern: /us-east-1/i,  city: 'Virginia' },
  { pattern: /us-west-2/i,  city: 'Oregon' },
  { pattern: /ap-southeast-1/i, city: 'Singapore' },
  { pattern: /ap-northeast-1/i, city: 'Tokyo' },
];

export function mapLocationToCity(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return '';
  const s = raw.trim();
  for (const entry of LOCATION_MAP) {
    if (entry.pattern.test(s)) return entry.city;
  }
  // If input looks like a device name (contains multiple dashes), don't use as-is
  if ((s.match(/-/g) || []).length >= 2) return '';
  // Fallback: return the raw string cleaned up (strip trailing whitespace/noise)
  return s;
}

/* ── Clickable entity name style ── */
export const entityLinkStyle: React.CSSProperties = {
  cursor: 'pointer',
  color: '#73b1ff',
  textDecoration: 'none',
  borderBottom: '1px dotted rgba(115,177,255,0.4)',
};
