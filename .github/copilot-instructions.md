# Copilot Instructions — Network Observability Console

## Project Overview

**Network Observability Console** is a Dynatrace App Platform application that
provides a real-time NOC (Network Operations Center) view of network device
health, interface status, traffic flows, anomaly detection, and problem
categories. It is deployed to `https://bnk46244.apps.dynatrace.com/` as app ID
`my.network.observability.console`.

The app tracks five network problem categories (the first being a Global aggregate):

1. **Global Overview** — all network problem categories combined
2. **Reachability** — device ping / SNMP availability / synthetic monitor reachability
3. **Saturation** — CPU, memory, and bandwidth utilization on network devices
4. **Errors & Discards** — interface CRC errors, in/out errors, packet discards
5. **Traffic** — throughput anomalies, traffic spikes, unexpected flow patterns

Each category has:
- A traffic-light KPI (problem count with thresholds)
- A secondary KPI (MTTR — median time to resolve)
- A "Now vs. Last Week" comparison
- A timeseries chart
- Agentic AI workflow actions (AI Triage, Create Tickets, Escalate, + category-specific)

Additionally the app includes:
- **SVG-based topology map** of network devices (routers, switches, firewalls, servers)
- **Device inventory table** with CPU/memory/traffic metrics
- **Interface health table** with load, errors, discards
- **Cloud flow analytics** page for AWS VPC / Transit Gateway flow logs
- **Davis Anomaly Detectors** — 18 curated detection rules across 6 categories

All DQL queries target `dt.entity.network:device`, `dt.entity.network:interface`,
`dt.entity.multiprotocol_monitor`, and `fetch bizevents` for flow logs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Platform | Dynatrace App Platform (`dt-app` CLI v0.147.0) |
| Language | TypeScript 5.6.2 |
| UI Framework | React 18.3.1 |
| Router | react-router-dom 6.x |
| Design System | `@dynatrace/strato-components` v1.7.2 (stable) |
| Preview Components | `@dynatrace/strato-components-preview` v1.9.0 |
| Design Tokens | `@dynatrace/strato-design-tokens` |
| Icons | `@dynatrace/strato-icons` v1.5.1 |
| Data Fetching | `@dynatrace-sdk/react-hooks` → `useDql()` |
| Automation | Platform `fetch()` to Automation REST API (no SDK import needed) |

---

## Project Structure

```
network-observability-console/
├── app.config.json          # App ID, version, environment URL, OAuth scopes
├── package.json             # Dependencies, scripts, version (MUST match app.config.json)
├── tsconfig.eslint.json     # ESLint TypeScript config
├── .eslintrc                # ESLint rules (Dynatrace-specific restrictions)
├── ui/
│   ├── main.tsx             # React entry point (AppRoot + BrowserRouter)
│   ├── tsconfig.json        # UI TypeScript config
│   ├── assets/              # Static assets (SVGs, PNGs)
│   └── app/
│       ├── App.tsx           # Route definitions wrapped in ErrorBoundary + DemoModeProvider
│       ├── types/
│       │   └── network.ts    # Core types: NetworkCategoryId, TopologyNode, AnomalyDetectorRule, etc.
│       ├── data/
│       │   ├── networkCategories.ts  # 5 categories config + DQL queries + NOC actions + NETWORK_QUERIES
│       │   ├── anomalyDetectors.ts   # 18 Davis anomaly detector rules + category/severity metadata + demo statuses
│       │   └── demoData.ts           # Mock data for demo mode (KPIs, topology, devices, interfaces, alerts)
│       ├── hooks/
│       │   ├── useDemoMode.tsx       # React context + hook for demo/live toggle
│       │   ├── useTopologyData.ts    # Hook for live/demo topology nodes+edges with force-directed layout
│       │   └── useWorkflowTrigger.ts # Hook to trigger Dynatrace Workflows via platform fetch()
│       ├── utils/
│       │   └── index.ts              # Shared utilities: SEV_COLORS, computeSeverity, toNum, formatKpiValue, etc.
│       ├── components/
│       │   ├── Header.tsx          # AppHeader with nav links + Live/Demo toggle
│       │   ├── ErrorBoundary.tsx   # React error boundary with reset button
│       │   ├── NocStatusBar.tsx    # Status bar: total alerts + severity + category pills
│       │   ├── KpiStrip.tsx        # Horizontal KPI card strip for all categories
│       │   ├── ActionModal.tsx     # Confirmation modal for workflow actions
│       │   ├── NocActionBar.tsx    # Primary + secondary NOC action buttons
│       │   ├── AlertList.tsx       # DataTable of active network alerts with row actions
│       │   ├── TopologyMap.tsx     # SVG-based interactive topology visualization
│       │   ├── DeviceTable.tsx     # Network device inventory DataTable
│       │   └── InterfaceTable.tsx  # Interface health DataTable
│       └── pages/
│           ├── Home.tsx              # NOC overview: status + KPIs + topology + chart + alerts
│           ├── Topology.tsx          # Full-screen topology map
│           ├── Devices.tsx           # Device inventory page
│           ├── Interfaces.tsx        # Interface health page
│           ├── FlowAnalytics.tsx     # AWS VPC/TGW flow analytics
│           ├── AnomalyDetectors.tsx  # Davis anomaly detector catalog (filterable, expandable)
│           ├── CategoryDetail.tsx    # Category detail with tabs
│           └── Data.tsx              # DQL explorer page
```

---

## Critical Rules & Conventions

### Strato Component Imports

**NEVER** import from the bare package — always use sub-paths:

```tsx
// ✅ CORRECT
import { Button } from '@dynatrace/strato-components/buttons';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { Modal } from '@dynatrace/strato-components-preview/overlays';
import { SingleValue } from '@dynatrace/strato-components-preview/charts';
import { ToggleButtonGroup } from '@dynatrace/strato-components-preview/buttons';
import { AppHeader, Page } from '@dynatrace/strato-components-preview/layouts';
import { Tabs, Tab } from '@dynatrace/strato-components-preview/navigation';
import { DataTable } from '@dynatrace/strato-components-preview/tables';
import { convertToTimeseries } from '@dynatrace/strato-components-preview/conversion-utilities';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';

// ❌ WRONG — will fail ESLint and may fail at runtime
import { Button } from '@dynatrace/strato-components';
import { Modal } from '@dynatrace/strato-components-preview';
```

### Stable vs. Preview

| Package | Status | Common Components |
|---|---|---|
| `@dynatrace/strato-components/*` | **Stable** | Button, Flex, Heading, Paragraph, Link, AppRoot |
| `@dynatrace/strato-components-preview/*` | **Preview** | Modal, AppHeader, Page, Charts, ToggleButtonGroup, Tabs, Tab, DQLEditor, DataTable |

Components from `strato-components` MUST NOT be imported from `strato-components-preview`
and vice versa. The ESLint config enforces this:
`Button`, `Flex`, `Heading`, `Link`, `Text`, `Paragraph` etc.
must come from `strato-components`, **not** from `strato-components-preview`.

### No Card Component

There is **no** `Card` component in Strato. Use a styled `div` or `Flex` with
design tokens for borders, shadows, and background (see pattern below).

### Design Token Patterns

The correct token paths for card-like containers:

```tsx
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';

// ✅ CORRECT token paths
const cardStyle: React.CSSProperties = {
  background: Colors.Background.Surface.Default,
  border: `1px solid ${Colors.Border.Neutral.Default}`,
  borderRadius: Borders.Radius.Container.Default,
  boxShadow: BoxShadows.Surface.Raised.Rest,
};

// ❌ WRONG — these paths do not exist
Colors.Background.Container.Default     // → use Colors.Background.Surface.Default
Borders.Border.Container.Default        // → use `1px solid ${Colors.Border.Neutral.Default}`
BoxShadows.BoxShadow.Container.Default  // → use BoxShadows.Surface.Raised.Rest
```

Other valid token paths used in the project:
- `Colors.Text.Critical.Default` — red text
- `Borders.Radius.Container.Default` — standard border radius
- `BoxShadows.Surface.Raised.Rest` / `.Hover` / `.Active` — elevation shadows

### Modal API

```tsx
<Modal
  show={boolean}
  onDismiss={() => void}
  title={string | ReactElement}
  size="small"
  footer={ReactNode}
>
  {children}
</Modal>
```

There are **NO** sub-components like `ModalBody`, `ModalHeader`, `ModalFooter`.
Use props instead.

### Tabs API

```tsx
<Tabs defaultIndex={0}>
  <Tab title="Overview">{children}</Tab>
  <Tab title="KPI Query">{children}</Tab>
</Tabs>
```

Import from `@dynatrace/strato-components-preview/navigation`.

### DataTable Usage

```tsx
<DataTable data={data} columns={columns} sortable fullWidth variant={{ rowDensity: 'condensed' }} height={480}>
  <DataTable.Pagination defaultPageSize={25} />
</DataTable>
```

- Use fixed `width` on columns, NOT `ratioWidth` with `resizable`
- Always guard empty state before `.length`

### Icons

Available from `@dynatrace/strato-icons`:
- `CheckmarkIcon` (NOT ~~CheckmarkCircleIcon~~)
- `CriticalIcon`
- `WarningIcon`

### Flex Gap Values

Only specific values are allowed for the `gap` prop:
`0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64`

Do **NOT** use values like 10, 14, 18, etc. — they will cause errors.

---

## Shared Utilities — `utils/index.ts`

Common utility functions shared across components/pages:

```tsx
import { SEV_COLORS, computeSeverity, toNum, formatKpiValue,
         formatTraffic, percentBarColor, formatDuration, modeBadgeStyle } from '../utils';
```

| Function | Purpose |
|---|---|
| `SEV_COLORS` | `{ critical: '#dc172a', warning: '#f5d30f', healthy: '#2ab06f' }` |
| `computeSeverity(value, thresholds)` | Evaluate ThresholdRule[] → `'critical' \| 'warning' \| 'healthy'` |
| `toNum(v)` | Coerce DQL bigint/string/null → number (safe) |
| `formatKpiValue(value, unit?)` | Format numbers with unit awareness (ns→human, %, Gbps) |
| `formatTraffic(gbps)` | Format Gbps/Mbps traffic values |
| `percentBarColor(value, warn?, crit?)` | Return color for percent bar visualization |
| `formatDuration(mins)` | Format minutes → `Xh Ym` string |
| `modeBadgeStyle(demoMode)` | CSS for Live/Demo badge |

**Always** use `toNum()` when reading DQL result values — DQL returns bigint/string.

---

## Data Fetching with useDql

```tsx
import { useDql } from '@dynatrace-sdk/react-hooks';

const { data, isLoading, error, refetch, cancel } = useDql(
  { query: 'fetch dt.entity.network:device | ...' },
  { enabled: true, refetchInterval: 60_000 }
);
// data.records: array of result rows
// data.types: field type metadata
```

- `enabled: false` prevents the query from running (used when `demoMode === true`)
- First arg is `{ query: string }` object, NOT a raw string

### Chart Data Shapes

| Chart | Data Shape |
|---|---|
| TimeseriesChart | `Timeseries[]` — `{ name, unit?, datapoints: { start: Date, value: number }[] }` |
| DonutChart | `{ slices: { category: string, value: number }[] }` |
| CategoricalBarChart | `{ category: string, value: number }[]` |
| SingleValue | `data: number \| string`, with optional `thresholds` and `applyThresholdBackground` |

Use `convertToTimeseries(records, types)` from `conversion-utilities` to
transform DQL query results into the Timeseries format. **Always wrap in try-catch.**

### Threshold Configuration

```tsx
{
  comparator: 'greater-than-or-equal-to', // full Strato comparator
  value: 500,
  backgroundColor: 'var(--dt-colors-charts-status-success-default, #2ab06f)',
}
```

Strato `ThresholdNumbersComparator` values:
`'greater-than'` | `'less-than'` | `'greater-than-or-equal-to'` | `'less-than-or-equal-to'` | `'equal-to'`

In `networkCategories.ts` we use shorthand (`>=`, `<`, etc.) and map them in components.

---

## Network Categories Configuration

All five categories are in `ui/app/data/networkCategories.ts` as `NETWORK_CATEGORIES`.

| ID | Icon | Primary KPI | Secondary KPI | DQL Entity |
|---|---|---|---|---|
| `global` | 🌐 | Total network problems | MTTR | fetch dt.davis.problems |
| `reachability` | 📡 | Unreachable device count | Avg downtime | dt.entity.multiprotocol_monitor |
| `saturation` | 🔥 | High util device count | Avg CPU% | dt.entity.network:device + timeseries |
| `errors` | ⚠️ | Error+discard count | Error rate/s | dt.entity.network:interface + timeseries |
| `traffic` | 📊 | Traffic anomaly count | Throughput Gbps | dt.entity.network:interface + timeseries |

Additional queries in `NETWORK_QUERIES`:
- `deviceInventory`, `interfaceHealth`, `vpcFlowTraffic`, `vpcTopEndpoints`,
  `vpcTopPorts`, `cpuUsage`, `memoryUsage`, `trafficPerDevice`, `interfaceUpDown`,
  `topologyNodes`, `topologyEdges`

### NOC Actions

Each category has 3 standard + 1 unique action via `nocActions()`:
- **Standard**: AI Triage, Create Tickets, Escalate
- **Unique per category**: Auto-Remediate (reachability), Capacity Report (saturation), Root Cause (errors), Traffic Reroute (traffic)

Global NOC actions:
- **Primary** (5): AI Triage All, Situation Report, Notify On-Call, Create Tickets, Escalate Critical
- **Secondary** (5): Shift Handoff, Flap Suppression, Maintenance Mode, Ack All Active, Correlate Incidents

---

## Davis Anomaly Detectors

The app includes a curated catalog of 18 generic Davis anomaly detection rules
defined in `ui/app/data/anomalyDetectors.ts`. These are derived from
real-world production configurations but **generalized** — no customer-specific
entities, vendor-locked SNMP extensions, or proprietary metric keys.

### Detector Categories (6)

| Category | Icon | Color | Count | Examples |
|---|---|---|---|---|
| `device-health` | 🖥️ | `#73b1ff` | 5 | CPU > 80%, Memory > 85%, Unavailable, PSU, Temperature |
| `interface-health` | 🔌 | `#b388ff` | 6 | Interface Down, Admin Down, Flapping, Util > 50%, CRC > 100, Discards |
| `routing` | 🛤️ | `#ffd54f` | 2 | BGP Peer State, EIGRP Response Time |
| `security` | 🔒 | `#ef5350` | 1 | Authentication Failures |
| `discovery` | 🔍 | `#4dd0e1` | 1 | New Device Detected |
| `syslog` | 📋 | `#ff8a65` | 3 | Severity Alert, Duplicate Address, Err-Disabled |

### Detector Structure

Each `AnomalyDetectorRule` has 17 fields:

```tsx
{
  id: string;                              // e.g., 'ad-cpu-busy'
  title: string;                           // Human-readable name
  description: string;                     // What it monitors
  category: AnomalyDetectorCategory;       // Logical group
  severity: AnomalyDetectorSeverity;       // critical | major | minor | info
  enabled: boolean;                        // Default on/off
  query: string;                           // DQL timeseries or fetch query
  threshold: number;                       // Numeric threshold
  alertCondition: 'ABOVE' | 'BELOW';       // When to fire
  slidingWindow: number;                   // Window size (samples)
  violatingSamples: number;                // Samples needed to fire
  dealertingSamples: number;               // Good samples to clear
  eventTitlePattern: string;               // Event template title
  eventDescriptionPattern: string;         // Event template description
  isMergingAllowed: boolean;               // Davis event merging
  relatedCategories: NetworkCategoryId[];   // Maps to network categories
  nocGuidance: string;                     // NOC best-practice notes
}
```

### Detector Metric Patterns

All detector DQL queries use generic metric keys:
- `com.dynatrace.extension.network_device.cpu_usage`
- `com.dynatrace.extension.network_device.memory_usage`
- `com.dynatrace.extension.network_device.temperature`
- `com.dynatrace.extension.network_device.psu.status`
- `com.dynatrace.extension.network_device.if.status`
- `com.dynatrace.extension.network_device.if.bytes_in.count`
- `com.dynatrace.extension.network_device.if.bytes_out.count`
- `com.dynatrace.extension.network_device.if.in.crc_errors.count`
- `com.dynatrace.extension.network_device.if.out.discards.count`
- `com.dynatrace.extension.network_device.bgp.peer.state`
- `com.dynatrace.extension.network_device.eigrp.peer.srtt`

Syslog/security detectors use `fetch logs` with pattern matching.

### Adding a New Detector

1. Add the rule to `ANOMALY_DETECTORS` in `anomalyDetectors.ts`
2. If new category needed, add to `AnomalyDetectorCategory` in `types/network.ts`
   and `ANOMALY_CATEGORY_META` in `anomalyDetectors.ts`
3. Add demo status entry in `DEMO_DETECTOR_STATUSES`

### Exports from `anomalyDetectors.ts`

| Export | Type | Purpose |
|---|---|---|
| `ANOMALY_DETECTORS` | `AnomalyDetectorRule[]` | The 18 detector configurations |
| `ANOMALY_CATEGORY_META` | `Record<category, {icon, label, color}>` | Display metadata per category |
| `SEVERITY_META` | `Record<severity, {color, bg, label, order}>` | Display metadata per severity |
| `DEMO_DETECTOR_STATUSES` | `AnomalyDetectorStatus[]` | Demo firing/OK status per detector |

---

## Topology Map

The topology visualization is a custom SVG-based React component (no external
graph libraries due to dt-app bundler constraints).

### Node Shapes
- Circle: Router, Cloud Gateway
- Diamond: Switch
- Rounded rectangle: Server
- Square: Firewall

### Health Colors
- `#2ab06f` — healthy
- `#fd8232` — warning
- `#dc172a` — critical
- `#73b1ff` — unknown

### Edge Colors (utilization)
- Green (`#2ab06f`): < 60%
- Amber (`#fd8232`): 60–80%
- Red (`#dc172a`): > 80%

### Topology Data Hook — `useTopologyData.ts`

```tsx
const { nodes, edges, isLoading } = useTopologyData();
```

- In **demo mode**: returns `DEMO_TOPOLOGY_NODES` and `DEMO_TOPOLOGY_EDGES`
- In **live mode**: fetches `dt.entity.network:device` entities and relationships,
  maps device types to `DeviceRole`, derives health from problem count, and
  applies a force-directed layout algorithm (runs in-memory, no external deps)
- Layout: circular initial placement → N iterations of repulsion + attraction → clamp to bounds

Demo topology has 13 nodes and 13 edges with varying health/utilization.

---

## ErrorBoundary

The app wraps all content in a React `ErrorBoundary` class component
(`ui/app/components/ErrorBoundary.tsx`). It:
- Catches render errors via `getDerivedStateFromError`
- Displays a user-friendly error message with the error text
- Provides a "Try Again" button that resets the state

```tsx
// In App.tsx:
<ErrorBoundary>
  <DemoModeProvider>
    <Page>...</Page>
  </DemoModeProvider>
</ErrorBoundary>
```

---

## Routing

| Path | Page | Component |
|---|---|---|
| `/` | NOC Overview | `Home.tsx` |
| `/topology` | Topology Map | `Topology.tsx` |
| `/devices` | Device Inventory | `Devices.tsx` |
| `/interfaces` | Interface Health | `Interfaces.tsx` |
| `/flows` | Flow Analytics | `FlowAnalytics.tsx` |
| `/detectors` | Anomaly Detectors | `AnomalyDetectors.tsx` |
| `/category/:categoryId` | Category Detail | `CategoryDetail.tsx` |
| `/data` | DQL Explorer | `Data.tsx` |

Navigation header auto-generates category links from `NETWORK_CATEGORIES`.
The "🔔 Anomaly Detectors" and "Explore Data" links are hardcoded after
the category links.

---

## Demo Mode

Toggle in header (Live data / Demo data).

- `DemoModeProvider` wraps entire app in `App.tsx`
- `useDemoMode()` returns `{ demoMode, setDemoMode }`
- When `demoMode === true`: `useDql` hooks are disabled (`enabled: false`) and components read from mock data
- When `demoMode === false`: live DQL queries execute against the Dynatrace environment

### Mock Data in `demoData.ts`

| Export | Description |
|---|---|
| `DEMO_KPI` | Current primary KPI values per category |
| `DEMO_KPI_WEEK_AGO` | Week-ago primary KPI values per category |
| `DEMO_SECONDARY_KPI` | Current secondary KPI values per category |
| `DEMO_SECONDARY_KPI_WEEK_AGO` | Week-ago secondary KPI values per category |
| `DEMO_CHART_DATA` | Timeseries chart data per category |
| `DEMO_TOPOLOGY_NODES` | 13 topology nodes with roles and health |
| `DEMO_TOPOLOGY_EDGES` | 13 topology edges with utilization and bandwidth |
| `DEMO_DEVICES` | 12 network devices with CPU/memory/traffic |
| `DEMO_INTERFACES` | 12 interfaces with status/load/errors |
| `DEMO_ALERTS` | 15 alerts across all categories |

### Detector Demo Data in `anomalyDetectors.ts`

| Export | Description |
|---|---|
| `DEMO_DETECTOR_STATUSES` | 18 statuses — some FIRING, some OK, with lastFired timestamps |

When adding new features, **always** add corresponding demo data entries.

---

## Version & Deployment

**Both** `package.json` and `app.config.json` must have the **same version**.
Bump both before every deploy.

```bash
node node_modules/dt-app/lib/src/bin.js build   # build for production
node node_modules/dt-app/lib/src/bin.js deploy   # builds + deploys to the environment
```

> Note: We invoke `dt-app` via `node` directly due to a symlink path-resolution
> issue. `npm run build` / `npx dt-app build` may fail with
> "Could not retrieve lib source folder".

The app URL is: `https://bnk46244.apps.dynatrace.com/ui/apps/my.network.observability.console`

When new OAuth scopes are added in `app.config.json`, the app user may need to
re-approve permissions in the Dynatrace UI after deploy.

### Current OAuth Scopes

- `storage:logs:read` — for VPC flow log queries
- `storage:buckets:read` — default template
- `storage:events:read` — for `fetch dt.davis.problems` DQL queries
- `storage:bizevents:read` — for `fetch bizevents` (VPC flow logs)
- `environment-api:problems:read` — for problems REST API access
- `environment-api:entities:read` — for `fetch dt.entity.*` queries
- `environment-api:metrics:read` — for `timeseries` metric queries

If new DQL commands are added (e.g. `automation:workflows:run`), the
corresponding scope must be added to `app.config.json`.

---

## DQL Query Patterns Used

```dql
-- Network device entities
fetch dt.entity.network:device
| fieldsAdd device_name = entity.name, tags, lifetime, management_zones
| limit 50

-- Interface health with metrics
fetch dt.entity.network:interface
| fieldsAdd device_name = belongs_to[dt.entity.network:device]
| fieldsAdd interface_name = entity.name
| limit 100

-- CPU usage timeseries
timeseries avg_cpu = avg(com.dynatrace.extension.network_device.cpu_usage),
  by: {dt.entity.network:device}
| fieldsAdd entityName(dt.entity.network:device)
| sort avg_cpu desc

-- VPC Flow traffic (bizevents)
fetch bizevents
| filter event.provider == "aws.vpc-flow-logs"
| summarize total_bytes = sum(bytes), by:{bin(timestamp, 10m)}
| sort total_bytes desc

-- Synthetic monitor reachability
fetch dt.entity.multiprotocol_monitor
| fieldsAdd entity.name
| fieldsAdd monitor_status = state

-- Davis problems (for category KPIs)
fetch dt.davis.problems
| filter in(event.category, array("AVAILABILITY","ERROR","RESOURCE_CONTENTION","SLOWDOWN"))
| summarize totalProblems = countDistinctExact(dt.davis.event_ids)

-- Week-ago window (1-day shifted back 7 days)
fetch dt.davis.problems, from: -7d-1d, to: -7d
| filter event.category == "ERROR"
| summarize errorProblems = countDistinctExact(dt.davis.event_ids)

-- Anomaly detector metric example (CPU)
timeseries cpuPerc = avg(com.dynatrace.extension.network_device.cpu_usage),
  by: { dt.entity.network:device },
  interval: 1m

-- Anomaly detector syslog example
fetch logs
| filter isNull(log.source)
  AND matchesValue(content, "*err-disable*")
| fieldsAdd dt.ingest.source.ip, interface
| makeTimeseries count(), by:{ dt.ingest.source.ip, interface }, interval: 1m
```

---

## Coding Patterns

### Conditional data source (live vs. demo)

```tsx
const { demoMode } = useDemoMode();
const { data, isLoading } = useDql(
  { query: kpi.dqlQuery },
  { enabled: !demoMode },
);
const value = demoMode ? DEMO_KPI[categoryId][field] : toNum(data?.records?.[0]?.[field]);
```

### Chart data conversion (always try-catch)

```tsx
const chartData = useMemo(() => {
  if (demoMode) return DEMO_CHART_DATA[catId];
  if (!result.data?.records || !result.data?.types) return null;
  try {
    return convertToTimeseries(result.data.records, result.data.types as any[]);
  } catch {
    return null;
  }
}, [demoMode, result.data]);
```

### Layout: NOC card containers

```tsx
<div style={{
  background: Colors.Background.Surface.Default,
  border: `1px solid ${Colors.Border.Neutral.Default}`,
  borderRadius: Borders.Radius.Container.Default,
  boxShadow: BoxShadows.Surface.Raised.Rest,
  padding: 20,
}}>
  {children}
</div>
```

### MTTR formatting (nanoseconds → human-readable)

```tsx
const mins = Math.round(value / 60_000_000_000);
if (mins < 1) return `${Math.round(value / 1_000_000_000)}s`;
if (mins < 60) return `${mins}m`;
const hrs = Math.floor(mins / 60);
return `${hrs}h ${mins % 60}m`;
```

### DQL time-window for week-ago comparison

```
fetch dt.davis.problems, from: -7d-1d, to: -7d
```
This fetches data from 8 days ago to 7 days ago (a 1-day window, same as the
current window, but shifted back by 7 days).

---

## Type Definitions — `types/network.ts`

### Core Types

| Type | Purpose |
|---|---|
| `NetworkCategoryId` | `'global' \| 'reachability' \| 'saturation' \| 'errors' \| 'traffic'` |
| `ThresholdRule` | Comparator + value + color for KPI traffic lights |
| `ActionType` | 17 workflow action types (ai-triage, create-ticket, escalate, etc.) |
| `ActionSeverity` | `'primary' \| 'secondary' \| 'danger'` button emphasis |
| `NetworkAction` | Full action definition with label, icon, workflowId, confirm/success messages |
| `KpiMetric` | KPI definition with DQL queries, thresholds, field names |
| `NetworkCategory` | Full category config: id, KPIs, chart, actions |
| `TopologyNode` | Node with id, label, role, health, x, y, optional metrics |
| `TopologyEdge` | Edge with source, target, utilization, bandwidth |
| `DeviceRole` | `'router' \| 'switch' \| 'firewall' \| 'server' \| 'cloud' \| 'cloud-gw' \| 'unknown'` |
| `NetworkDevice` | Device row data for DataTable |
| `NetworkInterface` | Interface row data for DataTable |
| `FlowRecord` | VPC flow log record |

### Anomaly Detector Types

| Type | Purpose |
|---|---|
| `AnomalyDetectorCategory` | `'device-health' \| 'interface-health' \| 'routing' \| 'security' \| 'discovery' \| 'syslog'` |
| `AnomalyDetectorSeverity` | `'critical' \| 'major' \| 'minor' \| 'info'` |
| `AnomalyDetectorRule` | 17-field detector configuration (query, threshold, alertCondition, etc.) |
| `AnomalyDetectorStatus` | Runtime status: detectorId, firingCount, lastFired, status |

### Other Types

| Type | Purpose |
|---|---|
| `DemoAlert` | Alert record for demo mode (severity, category, entity, timing) |
| `WorkflowStatus` | `'idle' \| 'loading' \| 'success' \| 'error'` |

---

## Workflow Actions

Each category has an `action` that triggers a Dynatrace Workflow:
- `workflowId` — must be replaced with real IDs from Automation → Workflows
- The `useWorkflowTrigger` hook POSTs to `/platform/automation/v1/workflows/{id}/run`
- Platform auth is automatic (no tokens needed, no SDK import needed)
- The `ActionModal` shows confirm message → loading → success/error

Currently all `workflowId` values are placeholders. To connect real workflows,
update the IDs in `networkCategories.ts`.

---

## Known TODOs

- Workflow IDs are placeholders — wire up to real Dynatrace Workflows
- Add `automation:workflows:run` scope when real workflows are connected
- Live topology data: query `dt.entity.network:device` relationships to build real graph
- Live alert data: derive from `fetch dt.davis.problems` filtered by network entity types
- Add SNMP trap integration for immediate alerts
- Consider WebSocket / SSE for sub-minute refresh on topology page
- Add device drill-down pages (per-device metrics, interface list, config history)
- Connect anomaly detectors to real `builtin:davis.anomaly-detectors` settings API
- Add detector enable/disable toggle (requires Settings API v2 write scope)
- Add detector firing history timeline chart
