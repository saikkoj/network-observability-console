# Network Observability Console

A Dynatrace App Platform application providing a real-time **NOC (Network Operations Center)** view of network device health, interface status, topology, traffic flows, and problem categories — with AI-powered operational actions.

**Live app:** https://bnk46244.apps.dynatrace.com/ui/apps/my.network.observability.console

---

## Features

### NOC Overview Dashboard
- **Status bar** with real-time alert counts and severity breakdown across all network categories
- **KPI strip** showing primary and secondary metrics per category with traffic-light thresholds and week-over-week comparison
- **Global problem trend chart** (4-hour window, 10-min bins)
- **Active alerts table** with severity, category, entity, and duration

### Network Problem Categories

| Category | What It Tracks | Primary KPI | Secondary KPI |
|---|---|---|---|
| **Global** | All network problems combined | Total problem count | MTTR |
| **Reachability** | Ping / SNMP availability | Unreachable device count | Avg downtime |
| **Saturation** | CPU, memory, bandwidth utilization | High-utilization device count | Avg CPU % |
| **Errors & Discards** | CRC errors, packet discards | Error + discard count | Error rate/s |
| **Traffic** | Throughput anomalies, flow patterns | Traffic anomaly count | Throughput Gbps |

Each category has a dedicated detail page with tabs for KPIs, charts, alerts, and NOC actions.

### Interactive Topology Map
- **SVG-based** visualization (no external graph libraries)
- **Node shapes** by device type: circles (routers/cloud GW), diamonds (switches), squares (firewalls), rounded rects (servers)
- **Health color coding**: green (healthy), amber (warning), red (critical), blue (unknown)
- **Edge colors** by link utilization: green (<60%), amber (60–80%), red (>80%)
- **Hover tooltips** with device details (IP, type, role, health, CPU, memory)
- **Force-directed auto-layout** for live data; hand-placed coordinates for demo data

### Device & Interface Tables
- **Device inventory** with CPU, memory, problem count, and reachability metrics
- **Interface health** with in/out load, errors, discards, and traffic rates

### Cloud Flow Analytics
- AWS VPC / Transit Gateway flow log analysis
- Top VPCs by traffic, top endpoint pairs, top ports

### AI-Powered NOC Actions
Each category includes actionable workflows:
- **AI Triage** — autonomous AI agent for root cause analysis
- **Create Tickets** — auto-generate ServiceNow incidents
- **Escalate** — PagerDuty escalation to L2/L3
- Category-specific actions: Auto-Remediate, Capacity Report, Root Cause Analysis, Traffic Reroute

### Davis Anomaly Detectors
18 curated, generic Davis anomaly detection rules across 6 categories — derived from real-world production configurations with no vendor-specific or customer-specific data.

| Category | Count | Examples |
|---|---|---|
| **Device Health** | 5 | CPU > 80%, Memory > 85%, Device Unavailable, PSU, Temperature |
| **Interface Health** | 6 | Interface Down, Admin Down, Flapping, Utilization > 50%, CRC Errors, Discards |
| **Routing** | 2 | BGP Peer State, EIGRP Response Time |
| **Security** | 1 | Authentication Failures |
| **Discovery** | 1 | New Device Detected |
| **Syslog** | 3 | Severity Alert, Duplicate Address, Err-Disabled |

Each detector shows threshold config, DQL query, event templates, and NOC guidance. Filter by category or severity.

### Demo / Live Mode
Toggle between demo data (pre-populated mock data) and live DQL queries. Demo mode is useful for showcasing the app without a connected environment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Platform | Dynatrace App Platform (`dt-app` CLI v0.147.0) |
| Language | TypeScript 5.6.2 |
| UI Framework | React 18.3.1 |
| Router | react-router-dom 6.x |
| Design System | `@dynatrace/strato-components` (stable + preview) |
| Design Tokens | `@dynatrace/strato-design-tokens` |
| Icons | `@dynatrace/strato-icons` |
| Data Fetching | `@dynatrace-sdk/react-hooks` → `useDql()` |

---

## Project Structure

```
network-observability-console/
├── app.config.json              # App ID, version, scopes
├── package.json                 # Dependencies & scripts
├── README.md
├── ui/
│   ├── main.tsx                 # React entry point
│   └── app/
│       ├── App.tsx              # Route definitions + providers
│       ├── types/
│       │   └── network.ts       # Core TypeScript types
│       ├── data/
│       │   ├── networkCategories.ts  # Category config + DQL queries
│       │   ├── anomalyDetectors.ts   # 18 Davis anomaly detector rules + metadata
│       │   └── demoData.ts           # Mock data for demo mode
│       ├── hooks/
│       │   ├── useDemoMode.tsx       # Demo/live toggle context
│       │   ├── useTopologyData.ts    # Topology data (live DQL + force layout)
│       │   └── useWorkflowTrigger.ts # Dynatrace Workflow trigger
│       ├── utils/
│       │   └── index.ts              # Shared utilities
│       ├── components/
│       │   ├── Header.tsx            # AppHeader with navigation
│       │   ├── NocStatusBar.tsx      # Alert severity status bar
│       │   ├── KpiStrip.tsx          # KPI card strip
│       │   ├── NocActionBar.tsx      # NOC action buttons
│       │   ├── ActionModal.tsx       # Action confirmation modal
│       │   ├── AlertList.tsx         # Active alerts DataTable
│       │   ├── TopologyMap.tsx       # SVG topology visualization
│       │   ├── DeviceTable.tsx       # Device inventory table
│       │   ├── InterfaceTable.tsx    # Interface health table
│       │   └── ErrorBoundary.tsx     # Global error boundary
│       └── pages/
│           ├── Home.tsx              # NOC overview dashboard
│           ├── Topology.tsx          # Full-screen topology map
│           ├── Devices.tsx           # Device inventory
│           ├── Interfaces.tsx        # Interface health
│           ├── FlowAnalytics.tsx     # AWS VPC flow analytics
│           ├── AnomalyDetectors.tsx  # Davis anomaly detector catalog
│           ├── CategoryDetail.tsx    # Per-category detail view
│           └── Data.tsx              # DQL explorer
```

---

## Routes

| Path | Page |
|---|---|
| `/` | NOC Overview |
| `/topology` | Network Topology |
| `/devices` | Device Inventory |
| `/interfaces` | Interface Health |
| `/flows` | Flow Analytics |
| `/detectors` | Anomaly Detectors |
| `/category/:categoryId` | Category Detail |
| `/data` | DQL Explorer |

---

## Getting Started

### Prerequisites
- Node.js ≥ 16.13.0
- Dynatrace environment with network monitoring enabled
- `dt-app` CLI (included as dev dependency)

### Install

```bash
npm install
```

### Development

```bash
npm start
```

This starts the local dev server with hot reload.

### Build

```bash
node node_modules/dt-app/lib/src/bin.js build
```

> Note: Use `node` directly instead of `npx dt-app build` to avoid path-resolution issues.

### Deploy

```bash
node node_modules/dt-app/lib/src/bin.js deploy
```

Deploys to the environment configured in `app.config.json`.

### Lint

```bash
npm run lint
```

---

## Required OAuth Scopes

| Scope | Purpose |
|---|---|
| `storage:logs:read` | VPC flow log queries |
| `storage:buckets:read` | Default template |
| `storage:events:read` | `dt.davis.problems` queries |
| `storage:bizevents:read` | Bizevent queries |
| `environment-api:problems:read` | Problems API access |
| `environment-api:entities:read` | `dt.entity.network:device` queries |
| `environment-api:metrics:read` | Network device metric queries |

---

## Version

**1.1.0** — Both `package.json` and `app.config.json` versions must stay in sync.
