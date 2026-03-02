/**
 * Core types for the Network Observability Console.
 *
 * Covers network devices, interfaces, topology, flow analytics,
 * and NOC action definitions.
 */

/* ── Network Category IDs ───────────────────────────── */
export type NetworkCategoryId =
  | 'global'
  | 'reachability'
  | 'saturation'
  | 'errors'
  | 'traffic';

/* ── Threshold Rules ────────────────────────────────── */
export interface ThresholdRule {
  comparator: '==' | '<' | '<=' | '>' | '>=';
  value: number | string;
  color: 'green' | 'amber' | 'red';
}

/* ── Action Types ───────────────────────────────────── */
export type ActionType =
  | 'ai-triage'
  | 'create-ticket'
  | 'escalate'
  | 'acknowledge'
  | 'auto-remediate'
  | 'runbook'
  | 'root-cause'
  | 'situation-report'
  | 'notify-oncall'
  | 'shift-handoff'
  | 'suppress-noise'
  | 'maintenance'
  | 'bulk-acknowledge'
  | 'correlate'
  | 'traffic-reroute'
  | 'flap-suppress'
  | 'capacity-report';

/** Visual emphasis for action buttons */
export type ActionSeverity = 'primary' | 'secondary' | 'danger';

export interface NetworkAction {
  type: ActionType;
  label: string;
  icon: string;
  actionSeverity?: ActionSeverity;
  description: string;
  confirmMessage: string;
  successMessage: string;
  workflowId: string;
  params?: Record<string, string>;
}

/* ── KPI Metric ─────────────────────────────────────── */
export interface KpiMetric {
  label: string;
  dqlQuery: string;
  weekAgoDqlQuery: string;
  fieldName: string;
  unit?: string;
  higherIsBetter: boolean;
  thresholds: ThresholdRule[];
}

/* ── Network Category ───────────────────────────────── */
export interface NetworkCategory {
  id: NetworkCategoryId;
  icon: string;
  title: string;
  subtitle: string;
  kpi: KpiMetric;
  secondaryKpi?: KpiMetric;
  chartQuery: string;
  chartTitle: string;
  chartType: 'timeseries' | 'bar' | 'donut';
  chartField: string;
  actions: NetworkAction[];
}

/* ── Topology Types ────────────────────────────────── */
export type DeviceRole = 'router' | 'switch' | 'firewall' | 'server' | 'cloud' | 'cloud-gw' | 'unknown';

export interface TopologyNode {
  id: string;
  label: string;
  role: DeviceRole;
  health: 'healthy' | 'warning' | 'critical' | 'unknown';
  x: number;
  y: number;
  ip?: string;
  type?: string;
  cpu?: number;
  memory?: number;
}

/** How the edge was discovered */
export type TopologyEdgeType = 'lldp' | 'bgp' | 'flow' | 'manual';

export interface TopologyEdge {
  id?: string;
  source: string;
  target: string;
  /** Utilization 0-100 */
  utilization: number;
  /** Bits per second */
  bandwidth: number;
  /** Discovery source — defaults to 'lldp' for backwards compat */
  edgeType?: TopologyEdgeType;
}

/* ── Device & Interface (table data shapes) ───────── */
export interface NetworkDevice {
  entityId: string;
  name: string;
  ip: string;
  type: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  cpu: number;
  memory: number;
  problems: number;
  reachability: number;
  traffic: number; // Gbps
}

export interface NetworkInterface {
  entityId: string;
  deviceName: string;
  name: string;
  status: 'UP' | 'DOWN' | 'ADMIN_DOWN';
  inLoad: number;
  outLoad: number;
  inErrors: number;
  outErrors: number;
  inDiscards: number;
  outDiscards: number;
  trafficIn: number;  // Gbps
  trafficOut: number;  // Gbps
}

/* ── Flow Analytics ─────────────────────────────────── */
export interface FlowRecord {
  sourceAddress: string;
  destinationAddress: string;
  sourcePort: number;
  destinationPort: number;
  bytes: number;
  packets: number;
  protocol: string;
  vpcId: string;
  action: 'ACCEPT' | 'REJECT';
}

/* ── Anomaly Detector Types ─────────────────────────── */
export type AnomalyDetectorCategory =
  | 'device-health'
  | 'interface-health'
  | 'routing'
  | 'security'
  | 'discovery'
  | 'syslog';

export type AnomalyDetectorSeverity = 'critical' | 'major' | 'minor' | 'info';

export interface AnomalyDetectorRule {
  /** Unique identifier */
  id: string;
  /** Human-readable title */
  title: string;
  /** What this detector monitors */
  description: string;
  /** Logical grouping */
  category: AnomalyDetectorCategory;
  /** Default severity when the detector fires */
  severity: AnomalyDetectorSeverity;
  /** Whether this detector is enabled by default */
  enabled: boolean;
  /** Metric or DQL query powering this detector */
  query: string;
  /** Threshold value (numeric) */
  threshold: number;
  /** Alert when metric is ABOVE or BELOW the threshold */
  alertCondition: 'ABOVE' | 'BELOW';
  /** Sliding window size (number of samples) */
  slidingWindow: number;
  /** How many samples must violate threshold to fire */
  violatingSamples: number;
  /** How many good samples to de-alert */
  dealertingSamples: number;
  /** Event template title pattern */
  eventTitlePattern: string;
  /** Event template description pattern */
  eventDescriptionPattern: string;
  /** Whether Davis should merge concurrent events */
  isMergingAllowed: boolean;
  /** Which network category(ies) this maps to */
  relatedCategories: NetworkCategoryId[];
  /** NOC best-practice notes */
  nocGuidance: string;
}

/** Runtime status of a detector (for demo/display) */
export interface AnomalyDetectorStatus {
  detectorId: string;
  firingCount: number;
  lastFired?: Date;
  status: 'OK' | 'FIRING' | 'DISABLED';
}

/* ── Demo Alert (same pattern as issue-management-console) ── */
export interface DemoAlert {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  title: string;
  category: 'REACHABILITY' | 'SATURATION' | 'ERRORS' | 'TRAFFIC';
  entity: string;
  startedAt: Date;
  status: 'ACTIVE' | 'CLOSED';
  durationMins: number;
}

export type WorkflowStatus = 'idle' | 'loading' | 'success' | 'error';
