import type { NetworkCategoryId, DemoAlert, TopologyNode, TopologyEdge, NetworkDevice, NetworkInterface } from '../types/network';

/* ────────────────────────────────────────────────────
 * Demo-mode mock data for Network Observability Console
 *
 * Mirrors the shape of live DQL results so components
 * can use the same rendering logic in both modes.
 * ──────────────────────────────────────────────────── */

/* ── Current KPI values ───────────────────────────── */
export const DEMO_KPI: Record<NetworkCategoryId, Record<string, number>> = {
  'global':        { totalProblems: 7 },
  'reachability':  { unreachableDevices: 2 },
  'saturation':    { saturatedInterfaces: 4 },
  'errors':        { totalErrors: 847 },
  'traffic':       { totalGbps: 12.4 },
};

/* ── Week-ago KPI values ──────────────────────────── */
export const DEMO_KPI_WEEK_AGO: Record<NetworkCategoryId, Record<string, number>> = {
  'global':        { totalProblems: 5 },
  'reachability':  { unreachableDevices: 1 },
  'saturation':    { saturatedInterfaces: 2 },
  'errors':        { totalErrors: 520 },
  'traffic':       { totalGbps: 11.1 },
};

/* ── Secondary KPI values ─────────────────────────── */
export const DEMO_SECONDARY_KPI: Record<NetworkCategoryId, Record<string, number>> = {
  'global':        { deviceCount: 48 },
  'reachability':  { avgReach: 97.8 },
  'saturation':    { saturatedDevices: 3 },
  'errors':        { totalDiscards: 312 },
  'traffic':       { downInterfaces: 3 },
};

/* ── Week-ago Secondary KPI values ────────────────── */
export const DEMO_SECONDARY_KPI_WEEK_AGO: Record<NetworkCategoryId, Record<string, number>> = {
  'global':        { deviceCount: 46 },
  'reachability':  { avgReach: 99.2 },
  'saturation':    { saturatedDevices: 1 },
  'errors':        { totalDiscards: 180 },
  'traffic':       { downInterfaces: 1 },
};

/* ── Helper: generate timeseries datapoints ───────── */
function tenMinTimeseries(
  name: string,
  values: number[],
): { name: string; datapoints: { start: Date; value: number }[] } {
  const now = Date.now();
  return {
    name,
    datapoints: values.map((v, i) => ({
      start: new Date(now - (values.length - 1 - i) * 600_000),
      value: v,
    })),
  };
}

/* ── Chart data per category ──────────────────────── */
export const DEMO_CHART_DATA: Record<NetworkCategoryId, unknown> = {
  'global': [
    tenMinTimeseries('REACHABILITY', [0, 0, 1, 1, 0, 0, 1, 2, 1, 0, 0, 1, 2, 1, 0, 1, 1, 2, 1, 0, 0, 1, 2, 1]),
    tenMinTimeseries('SATURATION', [1, 2, 1, 0, 1, 3, 2, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 2, 1, 3, 2, 1, 2]),
    tenMinTimeseries('ERRORS', [2, 3, 1, 2, 4, 3, 2, 1, 3, 2, 4, 3, 2, 1, 3, 4, 2, 1, 3, 2, 4, 3, 2, 1]),
    tenMinTimeseries('TRAFFIC', [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0]),
  ],
  'reachability': [
    tenMinTimeseries('unreachable', [0, 0, 1, 1, 0, 0, 1, 2, 1, 0, 0, 1, 2, 1, 0, 1, 1, 2, 1, 0, 0, 1, 2, 2]),
  ],
  'saturation': [
    tenMinTimeseries('inBytes', [
      2.1e9, 2.3e9, 2.5e9, 2.7e9, 3.0e9, 3.2e9, 3.5e9, 3.1e9, 2.8e9, 2.6e9, 2.4e9, 2.2e9,
      2.3e9, 2.5e9, 2.8e9, 3.1e9, 3.3e9, 3.0e9, 2.7e9, 2.5e9, 2.3e9, 2.1e9, 2.4e9, 2.6e9,
    ]),
    tenMinTimeseries('outBytes', [
      1.8e9, 2.0e9, 2.2e9, 2.4e9, 2.6e9, 2.8e9, 3.0e9, 2.7e9, 2.4e9, 2.2e9, 2.0e9, 1.9e9,
      2.0e9, 2.2e9, 2.5e9, 2.7e9, 2.9e9, 2.6e9, 2.3e9, 2.1e9, 1.9e9, 1.8e9, 2.1e9, 2.3e9,
    ]),
  ],
  'errors': [
    tenMinTimeseries('errIn', [12, 8, 15, 22, 18, 10, 5, 8, 12, 20, 25, 15, 10, 8, 12, 18, 22, 15, 10, 8, 12, 15, 18, 10]),
    tenMinTimeseries('errOut', [5, 3, 8, 10, 7, 4, 2, 3, 5, 8, 12, 7, 5, 3, 5, 8, 10, 7, 5, 3, 5, 7, 8, 5]),
    tenMinTimeseries('discIn', [3, 2, 5, 8, 6, 3, 1, 2, 4, 6, 8, 5, 3, 2, 3, 5, 7, 4, 3, 2, 3, 5, 6, 3]),
    tenMinTimeseries('discOut', [1, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 2, 1, 1, 2, 3, 3, 2, 1, 1, 1, 2, 3, 1]),
  ],
  'traffic': [
    tenMinTimeseries('inBytes', [
      2.1e9, 2.3e9, 2.5e9, 2.7e9, 3.0e9, 3.2e9, 3.5e9, 3.1e9, 2.8e9, 2.6e9, 2.4e9, 2.2e9,
      2.3e9, 2.5e9, 2.8e9, 3.1e9, 3.3e9, 3.0e9, 2.7e9, 2.5e9, 2.3e9, 2.1e9, 2.4e9, 2.6e9,
    ]),
    tenMinTimeseries('outBytes', [
      1.8e9, 2.0e9, 2.2e9, 2.4e9, 2.6e9, 2.8e9, 3.0e9, 2.7e9, 2.4e9, 2.2e9, 2.0e9, 1.9e9,
      2.0e9, 2.2e9, 2.5e9, 2.7e9, 2.9e9, 2.6e9, 2.3e9, 2.1e9, 1.9e9, 1.8e9, 2.1e9, 2.3e9,
    ]),
  ],
};

/* ── Topology Demo Data ───────────────────────────── */
export const DEMO_TOPOLOGY_NODES: TopologyNode[] = [
  // Core routers
  { id: 'core-rtr-01',  label: 'Core Router 01',    role: 'router',   health: 'healthy',  x: 400, y: 80,  ip: '10.0.0.1',  type: 'Cisco ASR 1001-X', cpu: 42, memory: 58 },
  { id: 'core-rtr-02',  label: 'Core Router 02',    role: 'router',   health: 'healthy',  x: 600, y: 80,  ip: '10.0.0.2',  type: 'Cisco ASR 1001-X', cpu: 38, memory: 52 },
  // Distribution switches
  { id: 'dist-sw-01',   label: 'Dist Switch 01',    role: 'switch',   health: 'healthy',  x: 250, y: 200, ip: '10.0.1.1',  type: 'Cisco Catalyst 9300', cpu: 22, memory: 45 },
  { id: 'dist-sw-02',   label: 'Dist Switch 02',    role: 'switch',   health: 'warning',  x: 500, y: 200, ip: '10.0.1.2',  type: 'Cisco Catalyst 9300', cpu: 78, memory: 85 },
  { id: 'dist-sw-03',   label: 'Dist Switch 03',    role: 'switch',   health: 'healthy',  x: 750, y: 200, ip: '10.0.1.3',  type: 'Cisco Catalyst 9300', cpu: 28, memory: 40 },
  // Firewall
  { id: 'fw-01',        label: 'Firewall 01',       role: 'firewall', health: 'healthy',  x: 500, y: 320, ip: '10.0.2.1',  type: 'Palo Alto PA-3260', cpu: 55, memory: 62 },
  // Access switches
  { id: 'acc-sw-01',    label: 'Access SW 01',      role: 'switch',   health: 'healthy',  x: 150, y: 340, ip: '10.0.10.1', type: 'Cisco Catalyst 2960', cpu: 15, memory: 30 },
  { id: 'acc-sw-02',    label: 'Access SW 02',      role: 'switch',   health: 'critical', x: 350, y: 340, ip: '10.0.10.2', type: 'Cisco Catalyst 2960', cpu: 92, memory: 88 },
  { id: 'acc-sw-03',    label: 'Access SW 03',      role: 'switch',   health: 'healthy',  x: 650, y: 340, ip: '10.0.10.3', type: 'Cisco Catalyst 2960', cpu: 18, memory: 35 },
  { id: 'acc-sw-04',    label: 'Access SW 04',      role: 'switch',   health: 'warning',  x: 850, y: 340, ip: '10.0.10.4', type: 'Cisco Catalyst 2960', cpu: 65, memory: 72 },
  // Cloud gateway
  { id: 'cloud-gw',     label: 'AWS TGW',           role: 'cloud-gw', health: 'healthy',  x: 500, y: 440, ip: '172.16.0.1', type: 'AWS Transit Gateway' },
  // Servers
  { id: 'srv-01',       label: 'Server Rack 1',     role: 'server',   health: 'healthy',  x: 200, y: 460, ip: '10.0.20.1', type: 'Dell PowerEdge R740', cpu: 60, memory: 72 },
  { id: 'srv-02',       label: 'Server Rack 2',     role: 'server',   health: 'warning',  x: 800, y: 460, ip: '10.0.20.2', type: 'Dell PowerEdge R740', cpu: 78, memory: 85 },
];

export const DEMO_TOPOLOGY_EDGES: TopologyEdge[] = [
  // Core to dist
  { source: 'core-rtr-01', target: 'dist-sw-01', utilization: 42, bandwidth: 10e9 },
  { source: 'core-rtr-01', target: 'dist-sw-02', utilization: 78, bandwidth: 10e9 },
  { source: 'core-rtr-02', target: 'dist-sw-02', utilization: 65, bandwidth: 10e9 },
  { source: 'core-rtr-02', target: 'dist-sw-03', utilization: 35, bandwidth: 10e9 },
  // Core interconnect
  { source: 'core-rtr-01', target: 'core-rtr-02', utilization: 55, bandwidth: 40e9 },
  // Dist to access
  { source: 'dist-sw-01', target: 'acc-sw-01', utilization: 30, bandwidth: 1e9 },
  { source: 'dist-sw-01', target: 'acc-sw-02', utilization: 92, bandwidth: 1e9 },
  { source: 'dist-sw-02', target: 'fw-01',     utilization: 60, bandwidth: 10e9 },
  { source: 'dist-sw-03', target: 'acc-sw-03', utilization: 25, bandwidth: 1e9 },
  { source: 'dist-sw-03', target: 'acc-sw-04', utilization: 68, bandwidth: 1e9 },
  // Firewall to cloud
  { source: 'fw-01',      target: 'cloud-gw',  utilization: 50, bandwidth: 10e9 },
  // Access to servers
  { source: 'acc-sw-01',  target: 'srv-01',    utilization: 40, bandwidth: 1e9 },
  { source: 'acc-sw-04',  target: 'srv-02',    utilization: 82, bandwidth: 1e9 },
];

/* ── Demo Device Inventory ────────────────────────── */
export const DEMO_DEVICES: NetworkDevice[] = [
  { entityId: 'NET-001', name: 'core-rtr-01',   ip: '10.0.0.1',   type: 'Router',   status: 'UP',       cpu: 42, memory: 58, problems: 0, reachability: 100,  traffic: 4.2 },
  { entityId: 'NET-002', name: 'core-rtr-02',   ip: '10.0.0.2',   type: 'Router',   status: 'UP',       cpu: 38, memory: 52, problems: 0, reachability: 100,  traffic: 3.8 },
  { entityId: 'NET-003', name: 'dist-sw-01',    ip: '10.0.1.1',   type: 'Switch',   status: 'UP',       cpu: 22, memory: 45, problems: 0, reachability: 100,  traffic: 1.5 },
  { entityId: 'NET-004', name: 'dist-sw-02',    ip: '10.0.1.2',   type: 'Switch',   status: 'DEGRADED', cpu: 78, memory: 85, problems: 2, reachability: 100,  traffic: 2.1 },
  { entityId: 'NET-005', name: 'dist-sw-03',    ip: '10.0.1.3',   type: 'Switch',   status: 'UP',       cpu: 28, memory: 40, problems: 0, reachability: 100,  traffic: 1.2 },
  { entityId: 'NET-006', name: 'fw-01',         ip: '10.0.2.1',   type: 'Firewall', status: 'UP',       cpu: 55, memory: 62, problems: 0, reachability: 100,  traffic: 2.8 },
  { entityId: 'NET-007', name: 'acc-sw-01',     ip: '10.0.10.1',  type: 'Switch',   status: 'UP',       cpu: 15, memory: 30, problems: 0, reachability: 100,  traffic: 0.5 },
  { entityId: 'NET-008', name: 'acc-sw-02',     ip: '10.0.10.2',  type: 'Switch',   status: 'DOWN',     cpu: 92, memory: 88, problems: 3, reachability: 0,    traffic: 0 },
  { entityId: 'NET-009', name: 'acc-sw-03',     ip: '10.0.10.3',  type: 'Switch',   status: 'UP',       cpu: 18, memory: 35, problems: 0, reachability: 100,  traffic: 0.4 },
  { entityId: 'NET-010', name: 'acc-sw-04',     ip: '10.0.10.4',  type: 'Switch',   status: 'DEGRADED', cpu: 65, memory: 72, problems: 1, reachability: 100,  traffic: 0.9 },
  { entityId: 'NET-011', name: 'edge-rtr-01',   ip: '10.0.0.10',  type: 'Router',   status: 'UP',       cpu: 35, memory: 48, problems: 0, reachability: 100,  traffic: 1.8 },
  { entityId: 'NET-012', name: 'edge-rtr-02',   ip: '10.0.0.11',  type: 'Router',   status: 'DEGRADED', cpu: 30, memory: 42, problems: 0, reachability: 98.5, traffic: 1.6 },
];

/* ── Demo Interface Data ──────────────────────────── */
export const DEMO_INTERFACES: NetworkInterface[] = [
  { entityId: 'IF-001', deviceName: 'core-rtr-01', name: 'GigabitEthernet0/0',  status: 'UP',   inLoad: 42, outLoad: 38, inErrors: 0,   outErrors: 0,  inDiscards: 0,  outDiscards: 0,  trafficIn: 2.1,  trafficOut: 1.9 },
  { entityId: 'IF-002', deviceName: 'core-rtr-01', name: 'GigabitEthernet0/1',  status: 'UP',   inLoad: 55, outLoad: 48, inErrors: 2,   outErrors: 0,  inDiscards: 1,  outDiscards: 0,  trafficIn: 2.7,  trafficOut: 2.4 },
  { entityId: 'IF-003', deviceName: 'core-rtr-02', name: 'GigabitEthernet0/0',  status: 'UP',   inLoad: 65, outLoad: 58, inErrors: 0,   outErrors: 1,  inDiscards: 0,  outDiscards: 0,  trafficIn: 3.2,  trafficOut: 2.9 },
  { entityId: 'IF-004', deviceName: 'dist-sw-02',  name: 'TenGigE0/0',          status: 'UP',   inLoad: 97, outLoad: 85, inErrors: 45,  outErrors: 12, inDiscards: 8,  outDiscards: 3,  trafficIn: 9.7,  trafficOut: 8.5 },
  { entityId: 'IF-005', deviceName: 'dist-sw-02',  name: 'TenGigE0/1',          status: 'UP',   inLoad: 88, outLoad: 92, inErrors: 22,  outErrors: 8,  inDiscards: 5,  outDiscards: 2,  trafficIn: 8.8,  trafficOut: 9.2 },
  { entityId: 'IF-006', deviceName: 'acc-sw-02',   name: 'FastEthernet0/1',     status: 'DOWN', inLoad: 0,  outLoad: 0,  inErrors: 150, outErrors: 80, inDiscards: 42, outDiscards: 18, trafficIn: 0,    trafficOut: 0 },
  { entityId: 'IF-007', deviceName: 'acc-sw-02',   name: 'FastEthernet0/2',     status: 'DOWN', inLoad: 0,  outLoad: 0,  inErrors: 200, outErrors: 95, inDiscards: 55, outDiscards: 22, trafficIn: 0,    trafficOut: 0 },
  { entityId: 'IF-008', deviceName: 'acc-sw-04',   name: 'GigabitEthernet0/1',  status: 'UP',   inLoad: 82, outLoad: 75, inErrors: 8,   outErrors: 3,  inDiscards: 2,  outDiscards: 1,  trafficIn: 0.82, trafficOut: 0.75 },
  { entityId: 'IF-009', deviceName: 'fw-01',       name: 'eth0',                status: 'UP',   inLoad: 60, outLoad: 55, inErrors: 0,   outErrors: 0,  inDiscards: 0,  outDiscards: 0,  trafficIn: 3.0,  trafficOut: 2.75 },
  { entityId: 'IF-010', deviceName: 'edge-rtr-01', name: 'GigabitEthernet0/0',  status: 'UP',   inLoad: 35, outLoad: 40, inErrors: 1,   outErrors: 0,  inDiscards: 0,  outDiscards: 0,  trafficIn: 1.75, trafficOut: 2.0 },
  { entityId: 'IF-011', deviceName: 'dist-sw-01',  name: 'GigabitEthernet0/0',  status: 'UP',   inLoad: 30, outLoad: 25, inErrors: 0,   outErrors: 0,  inDiscards: 0,  outDiscards: 0,  trafficIn: 1.5,  trafficOut: 1.25 },
  { entityId: 'IF-012', deviceName: 'dist-sw-03',  name: 'GigabitEthernet0/0',  status: 'UP',   inLoad: 25, outLoad: 20, inErrors: 0,   outErrors: 0,  inDiscards: 0,  outDiscards: 0,  trafficIn: 1.25, trafficOut: 1.0 },
];

/* ── Active Alerts (Network-specific) ─────────────── */
const now = Date.now();
function ago(mins: number): Date { return new Date(now - mins * 60_000); }

export const DEMO_ALERTS: DemoAlert[] = [
  // Critical — Reachability
  { id: 'N-2024-001', severity: 'critical', title: 'acc-sw-02 — Device unreachable (SNMP timeout)',             category: 'REACHABILITY', entity: 'acc-sw-02 (10.0.10.2)',   startedAt: ago(5),   status: 'ACTIVE', durationMins: 5 },
  { id: 'N-2024-002', severity: 'critical', title: 'edge-rtr-02 — Intermittent reachability (98.5% → 0%)',      category: 'REACHABILITY', entity: 'edge-rtr-02 (10.0.0.11)', startedAt: ago(2),   status: 'ACTIVE', durationMins: 2 },

  // Critical — Saturation
  { id: 'N-2024-003', severity: 'critical', title: 'dist-sw-02 TenGigE0/0 — Inbound load 97%',                  category: 'SATURATION',   entity: 'dist-sw-02 TenGigE0/0',   startedAt: ago(8),   status: 'ACTIVE', durationMins: 8 },
  { id: 'N-2024-004', severity: 'major',    title: 'dist-sw-02 TenGigE0/1 — Outbound load 92%',                  category: 'SATURATION',   entity: 'dist-sw-02 TenGigE0/1',   startedAt: ago(12),  status: 'ACTIVE', durationMins: 12 },

  // Major — Errors
  { id: 'N-2024-005', severity: 'major',    title: 'acc-sw-02 Fa0/1 — 150 errors inbound, link down',            category: 'ERRORS',       entity: 'acc-sw-02 Fa0/1',         startedAt: ago(5),   status: 'ACTIVE', durationMins: 5 },
  { id: 'N-2024-006', severity: 'major',    title: 'acc-sw-02 Fa0/2 — 200 errors inbound, 55 discards',          category: 'ERRORS',       entity: 'acc-sw-02 Fa0/2',         startedAt: ago(6),   status: 'ACTIVE', durationMins: 6 },
  { id: 'N-2024-007', severity: 'minor',    title: 'dist-sw-02 TenGigE0/0 — 45 errors inbound (elevated)',       category: 'ERRORS',       entity: 'dist-sw-02 TenGigE0/0',   startedAt: ago(15),  status: 'ACTIVE', durationMins: 15 },

  // Major — Saturation
  { id: 'N-2024-008', severity: 'major',    title: 'acc-sw-04 Gi0/1 — Inbound load 82%',                         category: 'SATURATION',   entity: 'acc-sw-04 Gi0/1',         startedAt: ago(20),  status: 'ACTIVE', durationMins: 20 },

  // Minor — Traffic
  { id: 'N-2024-009', severity: 'minor',    title: 'core-rtr-01 — BGP session flapping with upstream AS',        category: 'TRAFFIC',      entity: 'core-rtr-01 (10.0.0.1)',  startedAt: ago(30),  status: 'ACTIVE', durationMins: 30 },
  { id: 'N-2024-010', severity: 'minor',    title: 'AWS TGW — Inter-region traffic spike (+40% above baseline)', category: 'TRAFFIC',      entity: 'AWS TGW',                 startedAt: ago(25),  status: 'ACTIVE', durationMins: 25 },

  // Info
  { id: 'N-2024-011', severity: 'info',     title: 'dist-sw-02 — CPU usage elevated to 78%',                     category: 'SATURATION',   entity: 'dist-sw-02 (10.0.1.2)',   startedAt: ago(18),  status: 'ACTIVE', durationMins: 18 },
  { id: 'N-2024-012', severity: 'info',     title: 'Firmware upgrade scheduled for core-rtr-02',                  category: 'REACHABILITY', entity: 'core-rtr-02 (10.0.0.2)',  startedAt: ago(45),  status: 'ACTIVE', durationMins: 45 },

  // Resolved
  { id: 'N-2024-013', severity: 'major',    title: 'acc-sw-03 — Interface flap resolved (auto-dampened)',          category: 'ERRORS',       entity: 'acc-sw-03 Gi0/0',         startedAt: ago(90),  status: 'CLOSED', durationMins: 35 },
  { id: 'N-2024-014', severity: 'critical', title: 'fw-01 — HA failover completed, primary restored',             category: 'REACHABILITY', entity: 'fw-01 (10.0.2.1)',        startedAt: ago(120), status: 'CLOSED', durationMins: 15 },
  { id: 'N-2024-015', severity: 'minor',    title: 'dist-sw-01 — CRC errors cleared after cable replacement',     category: 'ERRORS',       entity: 'dist-sw-01 Gi0/2',        startedAt: ago(180), status: 'CLOSED', durationMins: 60 },
];
