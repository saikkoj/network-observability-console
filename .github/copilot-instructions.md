# Copilot Instructions — Network Observability Console

## Project Overview

**Network Observability Console** is a Dynatrace App Platform application that
provides a real-time NOC (Network Operations Center) view of network device
health, interface status, traffic flows, and problem categories. It is deployed
to `https://bnk46244.apps.dynatrace.com/` as app ID
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
│       ├── App.tsx           # Route definitions wrapped in DemoModeProvider
│       ├── types/
│       │   └── network.ts    # Core types: NetworkCategoryId, TopologyNode, etc.
│       ├── data/
│       │   ├── networkCategories.ts  # 5 categories config + DQL queries + NOC actions
│       │   └── demoData.ts           # Mock data for demo mode
│       ├── hooks/
│       │   ├── useDemoMode.tsx      # React context + hook for demo/live toggle
│       │   └── useWorkflowTrigger.ts # Hook to trigger Dynatrace Workflows
│       ├── components/
│       │   ├── Header.tsx          # AppHeader with category nav + Live/Demo toggle
│       │   ├── NocStatusBar.tsx    # Status bar: total alerts + severity + category pills
│       │   ├── KpiStrip.tsx        # Horizontal KPI card strip for all categories
│       │   ├── ActionModal.tsx     # Confirmation modal for workflow actions
│       │   ├── NocActionBar.tsx    # Primary + secondary NOC action buttons
│       │   ├── AlertList.tsx       # DataTable of active network alerts
│       │   ├── TopologyMap.tsx     # SVG-based interactive topology visualization
│       │   ├── DeviceTable.tsx     # Network device inventory DataTable
│       │   └── InterfaceTable.tsx  # Interface health DataTable
│       └── pages/
│           ├── Home.tsx            # NOC overview: status + KPIs + topology + chart + alerts
│           ├── Topology.tsx        # Full-screen topology map
│           ├── Devices.tsx         # Device inventory page
│           ├── Interfaces.tsx      # Interface health page
│           ├── FlowAnalytics.tsx   # AWS VPC/TGW flow analytics
│           ├── CategoryDetail.tsx  # Category detail with tabs
│           └── Data.tsx            # DQL explorer page
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

### No Card Component

There is **no** `Card` component in Strato. Use a styled `Flex` with design
tokens for borders, shadows, and background.

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

No sub-components (ModalBody, ModalHeader, ModalFooter). Use props.

### DataTable Usage

```tsx
<DataTable data={data} columns={columns} sortable fullWidth variant={{ rowDensity: 'condensed' }} height={480}>
  <DataTable.Pagination defaultPageSize={25} />
</DataTable>
```

- Use fixed `width` on columns, NOT `ratioWidth` with `resizable`
- Always guard empty state before `.length`

### DQL Value Coercion

DQL returns bigint/string types. Always coerce with `toNum()`:

```tsx
function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  return Number(v) || 0;
}
```

### Flex Gap Values

Only specific values allowed: `0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64`

### Icons

Available from `@dynatrace/strato-icons`:
- `CheckmarkIcon` (NOT ~~CheckmarkCircleIcon~~)
- `CriticalIcon`
- `WarningIcon`

---

## Data Fetching with useDql

```tsx
import { useDql } from '@dynatrace-sdk/react-hooks';

const { data, isLoading, error, refetch, cancel } = useDql(
  { query: 'fetch dt.entity.network:device | ...' },
  { enabled: true, refetchInterval: 60_000 }
);
```

- `enabled: false` prevents queries (used when `demoMode === true`)
- First arg is `{ query: string }`, NOT raw string

### Chart Data Shapes

| Chart | Data Shape |
|---|---|
| TimeseriesChart | `Timeseries[]` — `{ name, datapoints: { start: Date, value: number }[] }` |
| DonutChart | `{ slices: { category: string, value: number }[] }` |
| CategoricalBarChart | `{ category: string, value: number }[]` |

Use `convertToTimeseries(records, types)` with try-catch for live data.

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
  `vpcTopPorts`, `cpuUsage`, `memoryUsage`, `trafficPerDevice`, `interfaceUpDown`

### NOC Actions

Each category has 3 standard + 1 unique action via `nocActions()`:
- **Standard**: AI Triage, Create Tickets, Escalate
- **Unique per category**: Auto-Remediate (reachability), Capacity Report (saturation), Root Cause (errors), Traffic Reroute (traffic)

Global NOC actions:
- **Primary** (5): AI Triage All, Situation Report, Notify On-Call, Create Tickets, Escalate Critical
- **Secondary** (5): Shift Handoff, Flap Suppression, Maintenance Mode, Ack All Active, Correlate Incidents

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

Demo topology has 13 nodes and 13 edges with varying health/utilization.

---

## Routing

| Path | Page | Component |
|---|---|---|
| `/` | NOC Overview | `Home.tsx` |
| `/topology` | Topology Map | `Topology.tsx` |
| `/devices` | Device Inventory | `Devices.tsx` |
| `/interfaces` | Interface Health | `Interfaces.tsx` |
| `/flows` | Flow Analytics | `FlowAnalytics.tsx` |
| `/category/:categoryId` | Category Detail | `CategoryDetail.tsx` |
| `/data` | DQL Explorer | `Data.tsx` |

---

## Demo Mode

Toggle in header (Live data / Demo data).

- `DemoModeProvider` wraps entire app in `App.tsx`
- `useDemoMode()` returns `{ demoMode, setDemoMode }`
- When `demoMode === true`: `useDql` disabled, components read from `demoData.ts`
- Mock data in `demoData.ts`:
  - `DEMO_KPI`, `DEMO_KPI_WEEK_AGO`, `DEMO_SECONDARY_KPI`, `DEMO_SECONDARY_KPI_WEEK_AGO`
  - `DEMO_CHART_DATA` — timeseries per category
  - `DEMO_TOPOLOGY_NODES` (13 nodes), `DEMO_TOPOLOGY_EDGES` (13 edges)
  - `DEMO_DEVICES` (12 devices), `DEMO_INTERFACES` (12 interfaces)
  - `DEMO_ALERTS` (15 alerts across all categories)

---

## Version & Deployment

**Both** `package.json` and `app.config.json` must have the **same version**.

```bash
node node_modules/dt-app/lib/src/bin.js build   # build for production
node node_modules/dt-app/lib/src/bin.js deploy   # builds + deploys
```

> `npm run build` / `npx dt-app build` may fail with path-resolution issue.
> Use `node` directly.

App URL: `https://bnk46244.apps.dynatrace.com/ui/apps/my.network.observability.console`

### Current OAuth Scopes

- `storage:logs:read`
- `storage:buckets:read`
- `storage:events:read` — for `fetch dt.davis.problems`
- `storage:bizevents:read` — for `fetch bizevents` (VPC flow logs)
- `environment-api:entities:read` — for `fetch dt.entity.*`
- `environment-api:metrics:read` — for `timeseries` metric queries
- `environment-api:problems:read` — for problems REST API

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
timeseries avg_cpu = avg(com.dynatrace.extension.network_device.cpu_usage), by: {dt.entity.network:device}
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

### MTTR formatting (nanoseconds → human-readable)

```tsx
const mins = Math.round(value / 60_000_000_000);
if (mins < 1) return `${Math.round(value / 1_000_000_000)}s`;
if (mins < 60) return `${mins}m`;
const hrs = Math.floor(mins / 60);
return `${hrs}h ${mins % 60}m`;
```

---

## Known TODOs

- Workflow IDs are placeholders — wire up to real Dynatrace Workflows
- Add `automation:workflows:run` scope when real workflows are connected
- Live topology data: query `dt.entity.network:device` relationships to build real graph
- Live alert data: derive from `fetch dt.davis.problems` filtered by network entity types
- Add SNMP trap integration for immediate alerts
- Consider WebSocket / SSE for sub-minute refresh on topology page
- Add device drill-down pages (per-device metrics, interface list, config history)
