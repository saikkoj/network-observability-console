import type { NetworkCategory, NetworkAction } from '../types/network';

/**
 * Network Observability categories configuration.
 *
 * DQL queries are derived from real Dynatrace "Network devices" and
 * "Cloud network flow analytics" dashboards.
 *
 * Categories:
 *  1. Global Overview  — all network problems combined
 *  2. Reachability     — device reachability & availability
 *  3. Saturation       — interface utilization & capacity
 *  4. Errors           — interface errors & packet discards
 *  5. Traffic          — bandwidth utilization & flow analytics
 *
 * IMPORTANT: Replace `workflowId` values with real Dynatrace Workflow IDs
 * from your environment (Automation → Workflows).
 */

/* ── Standard NOC actions per category ────────────── */
function nocActions(categoryId: string, categoryLabel: string): NetworkAction[] {
  return [
    {
      type: 'ai-triage',
      label: 'AI Triage',
      icon: '🤖',
      description: `Activate an autonomous AI agent to analyze all ${categoryLabel} alerts. The agent correlates events across devices, identifies root causes, and assigns priority levels based on network impact.`,
      confirmMessage: `Deploy AI triage agent for ${categoryLabel} problems?`,
      successMessage: `AI Triage agent deployed! Analyzing ${categoryLabel} alerts.`,
      workflowId: `wf-ai-triage-${categoryId}`,
      params: { category: categoryId, trigger: 'manual', mode: 'agentic' },
    },
    {
      type: 'create-ticket',
      label: 'Create Tickets',
      icon: '🎫',
      description: `Auto-generate incident tickets in ServiceNow for all unacknowledged ${categoryLabel} problems with AI-enriched context.`,
      confirmMessage: `Create incident tickets for all open ${categoryLabel} problems?`,
      successMessage: `Ticket creation workflow started!`,
      workflowId: `wf-create-tickets-${categoryId}`,
      params: { category: categoryId, trigger: 'manual', itsm: 'servicenow' },
    },
    {
      type: 'escalate',
      label: 'Escalate',
      icon: '⬆️',
      description: `Escalate all critical ${categoryLabel} problems to the network L2/L3 on-call team via PagerDuty.`,
      confirmMessage: `Escalate critical ${categoryLabel} problems to L2/L3?`,
      successMessage: `Escalation triggered! Network L2/L3 on-call team notified.`,
      workflowId: `wf-escalate-${categoryId}`,
      params: { category: categoryId, trigger: 'manual', escalation: 'l2' },
    },
  ];
}

/* ================================================================
 *  NETWORK_CATEGORIES
 * ================================================================ */
export const NETWORK_CATEGORIES: NetworkCategory[] = [
  /* ── 1. Global Overview ────────────────────────── */
  {
    id: 'global',
    icon: '🌐',
    title: 'Global Overview',
    subtitle: 'All network device problems combined',
    kpi: {
      label: 'Total Network Problems',
      dqlQuery: [
        `fetch dt.davis.problems`,
        `| expand affected_entity_ids`,
        `| filter startsWith(affected_entity_ids, "CUSTOM_DEVICE")`,
        `| summarize totalProblems = countDistinct(display_id)`,
      ].join('\n'),
      weekAgoDqlQuery: [
        `fetch dt.davis.problems, from: -7d-1d, to: -7d`,
        `| expand affected_entity_ids`,
        `| filter startsWith(affected_entity_ids, "CUSTOM_DEVICE")`,
        `| summarize totalProblems = countDistinct(display_id)`,
      ].join('\n'),
      fieldName: 'totalProblems',
      higherIsBetter: false,
      thresholds: [
        { comparator: '<',  value: 5,  color: 'green' },
        { comparator: '<',  value: 20, color: 'amber' },
        { comparator: '>=', value: 20, color: 'red' },
      ],
    },
    secondaryKpi: {
      label: 'Total Devices',
      dqlQuery: `fetch \`dt.entity.network:device\`\n| summarize deviceCount = count()`,
      weekAgoDqlQuery: `fetch \`dt.entity.network:device\`\n| summarize deviceCount = count()`,
      fieldName: 'deviceCount',
      higherIsBetter: true,
      thresholds: [
        { comparator: '>=', value: 1,  color: 'green' },
        { comparator: '==', value: 0,  color: 'red' },
      ],
    },
    chartQuery: [
      `fetch dt.davis.problems`,
      `| expand affected_entity_ids`,
      `| filter startsWith(affected_entity_ids, "CUSTOM_DEVICE")`,
      `| summarize count = countDistinct(display_id), by:{bin(timestamp, 10m)}`,
      `| sort count desc`,
    ].join('\n'),
    chartTitle: 'Network problems over time',
    chartType: 'timeseries',
    chartField: 'count',
    actions: [
      ...nocActions('global', 'all network'),
      {
        type: 'situation-report',
        label: 'Situation Report',
        icon: '📋',
        description: 'Generate an AI situation report covering all active network problems including topology impact and remediation plan.',
        confirmMessage: 'Generate an AI situation report for all active network problems?',
        successMessage: 'AI generating situation report — will be delivered within 3 minutes.',
        workflowId: 'wf-sitrep-global',
        params: { category: 'global', trigger: 'manual', mode: 'agentic' },
      },
    ],
  },

  /* ── 2. Reachability ───────────────────────────── */
  {
    id: 'reachability',
    icon: '📡',
    title: 'Reachability',
    subtitle: 'Device reachability & availability monitoring',
    kpi: {
      label: 'Unreachable Devices',
      dqlQuery: [
        `fetch \`dt.entity.network:device\``,
        `| fieldsAdd ip = entity.name`,
        `| lookup [`,
        `  timeseries avgAvail=avg(dt.synthetic.multi_protocol.request.availability), by:{target.ip_address}`,
        `  | fieldsAdd ip=target.ip_address`,
        `], sourceField:ip, lookupField:ip, prefix:"avail."`,
        `| fieldsAdd reachPct = coalesce(arrayMax(avail.avgAvail), 100.0)`,
        `| filter reachPct < 100`,
        `| summarize unreachableDevices = count()`,
      ].join('\n'),
      weekAgoDqlQuery: [
        `fetch \`dt.entity.network:device\``,
        `| fieldsAdd ip = entity.name`,
        `| lookup [`,
        `  timeseries avgAvail=avg(dt.synthetic.multi_protocol.request.availability), from: -7d-1d, to: -7d, by:{target.ip_address}`,
        `  | fieldsAdd ip=target.ip_address`,
        `], sourceField:ip, lookupField:ip, prefix:"avail."`,
        `| fieldsAdd reachPct = coalesce(arrayMax(avail.avgAvail), 100.0)`,
        `| filter reachPct < 100`,
        `| summarize unreachableDevices = count()`,
      ].join('\n'),
      fieldName: 'unreachableDevices',
      higherIsBetter: false,
      thresholds: [
        { comparator: '==', value: 0, color: 'green' },
        { comparator: '<',  value: 3, color: 'amber' },
        { comparator: '>=', value: 3, color: 'red' },
      ],
    },
    secondaryKpi: {
      label: 'Avg Reachability %',
      dqlQuery: [
        `fetch \`dt.entity.network:device\``,
        `| fieldsAdd ip = entity.name`,
        `| lookup [`,
        `  timeseries avgAvail=avg(dt.synthetic.multi_protocol.request.availability), by:{target.ip_address}`,
        `  | fieldsAdd ip=target.ip_address`,
        `], sourceField:ip, lookupField:ip, prefix:"avail."`,
        `| fieldsAdd reachPct = coalesce(arrayMax(avail.avgAvail), 100.0)`,
        `| summarize avgReach = avg(reachPct)`,
      ].join('\n'),
      weekAgoDqlQuery: [
        `fetch \`dt.entity.network:device\``,
        `| fieldsAdd ip = entity.name`,
        `| lookup [`,
        `  timeseries avgAvail=avg(dt.synthetic.multi_protocol.request.availability), from: -7d-1d, to: -7d, by:{target.ip_address}`,
        `  | fieldsAdd ip=target.ip_address`,
        `], sourceField:ip, lookupField:ip, prefix:"avail."`,
        `| fieldsAdd reachPct = coalesce(arrayMax(avail.avgAvail), 100.0)`,
        `| summarize avgReach = avg(reachPct)`,
      ].join('\n'),
      fieldName: 'avgReach',
      unit: '%',
      higherIsBetter: true,
      thresholds: [
        { comparator: '>=', value: 99,  color: 'green' },
        { comparator: '>=', value: 95,  color: 'amber' },
        { comparator: '<',  value: 95,  color: 'red' },
      ],
    },
    chartQuery: [
      `timeseries avgAvail=avg(dt.synthetic.multi_protocol.request.availability), by:{target.ip_address}`,
    ].join('\n'),
    chartTitle: 'Device reachability over time',
    chartType: 'timeseries',
    chartField: 'avgAvail',
    actions: [
      ...nocActions('reachability', 'reachability'),
      {
        type: 'auto-remediate',
        label: 'Auto-Remediate',
        icon: '🔧',
        description: 'Trigger automated SNMP polling restart and failover checks for unreachable devices.',
        confirmMessage: 'Activate auto-remediation for unreachable devices?',
        successMessage: 'Auto-remediation agent deployed!',
        workflowId: 'wf-remediate-reachability',
        params: { category: 'reachability', trigger: 'manual', mode: 'agentic' },
      },
    ],
  },

  /* ── 3. Saturation ─────────────────────────────── */
  {
    id: 'saturation',
    icon: '📈',
    title: 'Saturation',
    subtitle: 'Interface utilization & capacity alerts',
    kpi: {
      label: 'High-Traffic Interfaces (>100 Mbps)',
      dqlQuery: [
        `timeseries {`,
        `  ifInBytes = sum(com.dynatrace.extension.network_device.if.bytes_in.count),`,
        `  ifOutBytes = sum(com.dynatrace.extension.network_device.if.bytes_out.count)`,
        `}, by:{\`dt.entity.network:device\`, \`dt.entity.network:interface\`}`,
        `| fieldsAdd maxBps = (coalesce(arrayMax(ifInBytes), 0) + coalesce(arrayMax(ifOutBytes), 0)) * 8 / 300`,
        `| filter maxBps > 100000000`,
        `| summarize saturatedInterfaces = count()`,
      ].join('\n'),
      weekAgoDqlQuery: [
        `timeseries {`,
        `  ifInBytes = sum(com.dynatrace.extension.network_device.if.bytes_in.count),`,
        `  ifOutBytes = sum(com.dynatrace.extension.network_device.if.bytes_out.count)`,
        `}, from: -7d-1d, to: -7d, by:{\`dt.entity.network:device\`, \`dt.entity.network:interface\`}`,
        `| fieldsAdd maxBps = (coalesce(arrayMax(ifInBytes), 0) + coalesce(arrayMax(ifOutBytes), 0)) * 8 / 300`,
        `| filter maxBps > 100000000`,
        `| summarize saturatedInterfaces = count()`,
      ].join('\n'),
      fieldName: 'saturatedInterfaces',
      higherIsBetter: false,
      thresholds: [
        { comparator: '==', value: 0,  color: 'green' },
        { comparator: '<',  value: 5,  color: 'amber' },
        { comparator: '>=', value: 5,  color: 'red' },
      ],
    },
    secondaryKpi: {
      label: 'High-Traffic Devices',
      dqlQuery: [
        `timeseries {`,
        `  ifInBytes = sum(com.dynatrace.extension.network_device.if.bytes_in.count),`,
        `  ifOutBytes = sum(com.dynatrace.extension.network_device.if.bytes_out.count)`,
        `}, by:{\`dt.entity.network:device\`, \`dt.entity.network:interface\`}`,
        `| fieldsAdd maxBps = (coalesce(arrayMax(ifInBytes), 0) + coalesce(arrayMax(ifOutBytes), 0)) * 8 / 300`,
        `| filter maxBps > 100000000`,
        `| summarize saturatedDevices = countDistinct(\`dt.entity.network:device\`)`,
      ].join('\n'),
      weekAgoDqlQuery: [
        `timeseries {`,
        `  ifInBytes = sum(com.dynatrace.extension.network_device.if.bytes_in.count),`,
        `  ifOutBytes = sum(com.dynatrace.extension.network_device.if.bytes_out.count)`,
        `}, from: -7d-1d, to: -7d, by:{\`dt.entity.network:device\`, \`dt.entity.network:interface\`}`,
        `| fieldsAdd maxBps = (coalesce(arrayMax(ifInBytes), 0) + coalesce(arrayMax(ifOutBytes), 0)) * 8 / 300`,
        `| filter maxBps > 100000000`,
        `| summarize saturatedDevices = countDistinct(\`dt.entity.network:device\`)`,
      ].join('\n'),
      fieldName: 'saturatedDevices',
      higherIsBetter: false,
      thresholds: [
        { comparator: '==', value: 0,  color: 'green' },
        { comparator: '<',  value: 3,  color: 'amber' },
        { comparator: '>=', value: 3,  color: 'red' },
      ],
    },
    chartQuery: [
      `timeseries {`,
      `  inBytes = sum(com.dynatrace.extension.network_device.if.bytes_in.count),`,
      `  outBytes = sum(com.dynatrace.extension.network_device.if.bytes_out.count)`,
      `}`,
    ].join('\n'),
    chartTitle: 'Total network traffic (in/out bytes)',
    chartType: 'timeseries',
    chartField: 'inBytes',
    actions: [
      ...nocActions('saturation', 'saturation'),
      {
        type: 'capacity-report',
        label: 'Capacity Report',
        icon: '📊',
        description: 'Generate an AI capacity analysis report showing utilization trends, projected exhaustion dates, and recommended upgrades.',
        confirmMessage: 'Generate a capacity planning report?',
        successMessage: 'Capacity report generation started!',
        workflowId: 'wf-capacity-report',
        params: { category: 'saturation', trigger: 'manual', mode: 'agentic' },
      },
    ],
  },

  /* ── 4. Errors & Discards ──────────────────────── */
  {
    id: 'errors',
    icon: '❌',
    title: 'Errors & Discards',
    subtitle: 'Interface errors, discards, and packet loss',
    kpi: {
      label: 'Total Errors (In+Out)',
      dqlQuery: [
        `timeseries {`,
        `  errIn = sum(com.dynatrace.extension.network_device.if.in.errors.count),`,
        `  errOut = sum(com.dynatrace.extension.network_device.if.out.errors.count)`,
        `}`,
        `| fieldsAdd totalErrors = arraySum(errIn) + arraySum(errOut)`,
        `| summarize totalErrors = sum(totalErrors)`,
      ].join('\n'),
      weekAgoDqlQuery: [
        `timeseries {`,
        `  errIn = sum(com.dynatrace.extension.network_device.if.in.errors.count),`,
        `  errOut = sum(com.dynatrace.extension.network_device.if.out.errors.count)`,
        `}, from: -7d-1d, to: -7d`,
        `| fieldsAdd totalErrors = arraySum(errIn) + arraySum(errOut)`,
        `| summarize totalErrors = sum(totalErrors)`,
      ].join('\n'),
      fieldName: 'totalErrors',
      higherIsBetter: false,
      thresholds: [
        { comparator: '<',  value: 100,   color: 'green' },
        { comparator: '<',  value: 1000,  color: 'amber' },
        { comparator: '>=', value: 1000,  color: 'red' },
      ],
    },
    secondaryKpi: {
      label: 'Total Discards (In+Out)',
      dqlQuery: [
        `timeseries {`,
        `  discIn = sum(com.dynatrace.extension.network_device.if.in.discards.count),`,
        `  discOut = sum(com.dynatrace.extension.network_device.if.out.discards.count)`,
        `}`,
        `| fieldsAdd totalDiscards = arraySum(discIn) + arraySum(discOut)`,
        `| summarize totalDiscards = sum(totalDiscards)`,
      ].join('\n'),
      weekAgoDqlQuery: [
        `timeseries {`,
        `  discIn = sum(com.dynatrace.extension.network_device.if.in.discards.count),`,
        `  discOut = sum(com.dynatrace.extension.network_device.if.out.discards.count)`,
        `}, from: -7d-1d, to: -7d`,
        `| fieldsAdd totalDiscards = arraySum(discIn) + arraySum(discOut)`,
        `| summarize totalDiscards = sum(totalDiscards)`,
      ].join('\n'),
      fieldName: 'totalDiscards',
      higherIsBetter: false,
      thresholds: [
        { comparator: '<',  value: 50,   color: 'green' },
        { comparator: '<',  value: 500,  color: 'amber' },
        { comparator: '>=', value: 500,  color: 'red' },
      ],
    },
    chartQuery: [
      `timeseries {`,
      `  errIn = sum(com.dynatrace.extension.network_device.if.in.errors.count),`,
      `  errOut = sum(com.dynatrace.extension.network_device.if.out.errors.count),`,
      `  discIn = sum(com.dynatrace.extension.network_device.if.in.discards.count),`,
      `  discOut = sum(com.dynatrace.extension.network_device.if.out.discards.count)`,
      `}`,
    ].join('\n'),
    chartTitle: 'Interface errors & discards over time',
    chartType: 'timeseries',
    chartField: 'errIn',
    actions: [
      ...nocActions('errors', 'error'),
      {
        type: 'root-cause',
        label: 'Root Cause Analysis',
        icon: '🔍',
        description: 'Launch AI root-cause analysis for interface error spikes. The agent correlates errors with topology changes, CRC issues, and link flapping.',
        confirmMessage: 'Run AI root cause analysis for interface errors?',
        successMessage: 'Root cause analysis agent deployed!',
        workflowId: 'wf-rca-errors',
        params: { category: 'errors', trigger: 'manual', mode: 'agentic' },
      },
    ],
  },

  /* ── 5. Traffic ────────────────────────────────── */
  {
    id: 'traffic',
    icon: '🔄',
    title: 'Traffic',
    subtitle: 'Bandwidth utilization & flow analytics',
    kpi: {
      label: 'Total Traffic (Gbps)',
      dqlQuery: [
        `timeseries {`,
        `  inBits = sum(com.dynatrace.extension.network_device.if.bytes_in.count),`,
        `  outBits = sum(com.dynatrace.extension.network_device.if.bytes_out.count)`,
        `}`,
        `| fieldsAdd totalBps = (arrayMax(inBits) + arrayMax(outBits)) * 8 / 300`,
        `| fieldsAdd totalGbps = totalBps / 1000000000`,
        `| summarize totalGbps = sum(totalGbps)`,
      ].join('\n'),
      weekAgoDqlQuery: [
        `timeseries {`,
        `  inBits = sum(com.dynatrace.extension.network_device.if.bytes_in.count),`,
        `  outBits = sum(com.dynatrace.extension.network_device.if.bytes_out.count)`,
        `}, from: -7d-1d, to: -7d`,
        `| fieldsAdd totalBps = (arrayMax(inBits) + arrayMax(outBits)) * 8 / 300`,
        `| fieldsAdd totalGbps = totalBps / 1000000000`,
        `| summarize totalGbps = sum(totalGbps)`,
      ].join('\n'),
      fieldName: 'totalGbps',
      unit: 'Gbps',
      higherIsBetter: false,
      thresholds: [
        { comparator: '<',  value: 10,  color: 'green' },
        { comparator: '<',  value: 50,  color: 'amber' },
        { comparator: '>=', value: 50,  color: 'red' },
      ],
    },
    secondaryKpi: {
      label: 'Interfaces Down',
      dqlQuery: [
        `fetch \`dt.entity.network:interface\``,
        `| lookup [`,
        `  timeseries status=avg(com.dynatrace.extension.network_device.if.status), by:{\`dt.entity.network:interface\`}`,
        `  | fieldsAdd currentStatus = arrayMax(status)`,
        `], sourceField:id, lookupField:\`dt.entity.network:interface\`, prefix:"s."`,
        `| filter toDouble(s.currentStatus) < 1.0`,
        `| summarize downInterfaces = count()`,
      ].join('\n'),
      weekAgoDqlQuery: [
        `fetch \`dt.entity.network:interface\``,
        `| lookup [`,
        `  timeseries status=avg(com.dynatrace.extension.network_device.if.status), from: -7d-1d, to: -7d, by:{\`dt.entity.network:interface\`}`,
        `  | fieldsAdd currentStatus = arrayMax(status)`,
        `], sourceField:id, lookupField:\`dt.entity.network:interface\`, prefix:"s."`,
        `| filter toDouble(s.currentStatus) < 1.0`,
        `| summarize downInterfaces = count()`,
      ].join('\n'),
      fieldName: 'downInterfaces',
      higherIsBetter: false,
      thresholds: [
        { comparator: '==', value: 0,  color: 'green' },
        { comparator: '<',  value: 5,  color: 'amber' },
        { comparator: '>=', value: 5,  color: 'red' },
      ],
    },
    chartQuery: [
      `timeseries {`,
      `  inBytes = sum(com.dynatrace.extension.network_device.if.bytes_in.count),`,
      `  outBytes = sum(com.dynatrace.extension.network_device.if.bytes_out.count)`,
      `}`,
    ].join('\n'),
    chartTitle: 'Network traffic over time (in/out)',
    chartType: 'timeseries',
    chartField: 'inBytes',
    actions: [
      ...nocActions('traffic', 'traffic'),
      {
        type: 'traffic-reroute',
        label: 'Traffic Reroute',
        icon: '🔀',
        description: 'Trigger AI-powered traffic rerouting to offload saturated links. The agent evaluates alternative paths and redistributes load.',
        confirmMessage: 'Activate traffic rerouting for congested links?',
        successMessage: 'Traffic reroute agent deployed!',
        workflowId: 'wf-traffic-reroute',
        params: { category: 'traffic', trigger: 'manual', mode: 'agentic' },
      },
    ],
  },
];

/* ================================================================
 *  GLOBAL NOC ACTIONS
 * ================================================================ */

/** Primary NOC actions — always visible in the action bar */
export const NOC_PRIMARY_ACTIONS: NetworkAction[] = [
  {
    type: 'ai-triage',
    label: 'AI Triage All',
    icon: '🤖',
    actionSeverity: 'primary',
    description: 'Deploy an autonomous AI agent to triage ALL active network problems. Correlates events, identifies root causes, and produces a prioritized action plan.',
    confirmMessage: 'Deploy AI triage agent for all active network problems?',
    successMessage: 'AI Triage agent deployed! Analyzing all active network problems.',
    workflowId: 'wf-ai-triage-global',
    params: { category: 'global', trigger: 'noc-action-bar', mode: 'agentic' },
  },
  {
    type: 'situation-report',
    label: 'Situation Report',
    icon: '📋',
    actionSeverity: 'primary',
    description: 'Generate a comprehensive AI situation report covering all active network incidents with topology impact analysis.',
    confirmMessage: 'Generate an AI situation report for all active network problems?',
    successMessage: 'AI generating situation report.',
    workflowId: 'wf-sitrep-global',
    params: { category: 'global', trigger: 'noc-action-bar', mode: 'agentic' },
  },
  {
    type: 'notify-oncall',
    label: 'Notify On-Call',
    icon: '📞',
    actionSeverity: 'danger',
    description: 'Page the on-call network engineer via PagerDuty with an AI-generated situation brief.',
    confirmMessage: 'Page the on-call team with an AI-generated situation brief?',
    successMessage: 'On-call team notified via PagerDuty.',
    workflowId: 'wf-notify-oncall',
    params: { trigger: 'noc-action-bar', channel: 'pagerduty' },
  },
  {
    type: 'create-ticket',
    label: 'Create Tickets',
    icon: '🎫',
    actionSeverity: 'primary',
    description: 'Auto-generate ServiceNow incident tickets for all unacknowledged network problems.',
    confirmMessage: 'Create incident tickets for all open network problems?',
    successMessage: 'Ticket creation workflow started!',
    workflowId: 'wf-create-tickets-global',
    params: { category: 'global', trigger: 'noc-action-bar', itsm: 'servicenow' },
  },
  {
    type: 'escalate',
    label: 'Escalate Critical',
    icon: '⬆️',
    actionSeverity: 'danger',
    description: 'Escalate all critical-severity network problems to the L2/L3 network engineering team.',
    confirmMessage: 'Escalate all critical network problems to L2/L3?',
    successMessage: 'Escalation triggered!',
    workflowId: 'wf-escalate-critical',
    params: { trigger: 'noc-action-bar', escalation: 'l2-l3' },
  },
];

/** Secondary NOC actions — shown in collapsible row */
export const NOC_SECONDARY_ACTIONS: NetworkAction[] = [
  {
    type: 'shift-handoff',
    label: 'Shift Handoff',
    icon: '📝',
    actionSeverity: 'secondary',
    description: 'Generate an AI-powered shift handoff report summarizing all network incidents and ongoing remediations.',
    confirmMessage: 'Generate a shift handoff report?',
    successMessage: 'Shift handoff report generated.',
    workflowId: 'wf-shift-handoff',
    params: { trigger: 'noc-action-bar', mode: 'agentic' },
  },
  {
    type: 'flap-suppress',
    label: 'Flap Suppression',
    icon: '🔇',
    actionSeverity: 'secondary',
    description: 'Activate interface flap suppression. Auto-dampens flapping interface alerts for a configurable period.',
    confirmMessage: 'Activate interface flap suppression?',
    successMessage: 'Flap suppression active!',
    workflowId: 'wf-flap-suppress',
    params: { trigger: 'noc-action-bar', mode: 'agentic' },
  },
  {
    type: 'maintenance',
    label: 'Maintenance Mode',
    icon: '🔧',
    actionSeverity: 'secondary',
    description: 'Put selected network devices into maintenance mode. Alerts will be suppressed.',
    confirmMessage: 'Enter maintenance mode?',
    successMessage: 'Maintenance mode activated.',
    workflowId: 'wf-maintenance-mode',
    params: { trigger: 'noc-action-bar' },
  },
  {
    type: 'bulk-acknowledge',
    label: 'Ack All Active',
    icon: '✅',
    actionSeverity: 'secondary',
    description: 'Bulk-acknowledge all active network problems.',
    confirmMessage: 'Acknowledge ALL active network problems?',
    successMessage: 'All active problems acknowledged.',
    workflowId: 'wf-bulk-acknowledge',
    params: { trigger: 'noc-action-bar' },
  },
  {
    type: 'correlate',
    label: 'Correlate Incidents',
    icon: '🔗',
    actionSeverity: 'secondary',
    description: 'Run AI correlation analysis across all active network incidents to identify common root causes and shared topology paths.',
    confirmMessage: 'Run AI cross-incident correlation?',
    successMessage: 'Correlation analysis running!',
    workflowId: 'wf-correlate-incidents',
    params: { trigger: 'noc-action-bar', mode: 'agentic' },
  },
];

/* ── Extra DQL Queries (used by detail pages) ────── */
export const NETWORK_QUERIES = {
  /** Device inventory table */
  deviceInventory: [
    `fetch \`dt.entity.network:device\``,
    `| fieldsAdd deviceName = entity.name`,
    `| fieldsAdd ip = entity.name`,
    `| fieldsAdd deviceType = ""`,
    `| lookup [`,
    `  timeseries cpuPerc=avg(com.dynatrace.extension.network_device.cpu_usage), by:{\`dt.entity.network:device\`}`,
    `  | fieldsAdd cpuMax = arrayMax(cpuPerc)`,
    `], sourceField:id, lookupField:\`dt.entity.network:device\`, prefix:"cpu."`,
    `| lookup [`,
    `  timeseries {`,
    `    memUsed=sum(com.dynatrace.extension.network_device.memory_used),`,
    `    memFree=sum(com.dynatrace.extension.network_device.memory_free),`,
    `    memTotal=sum(com.dynatrace.extension.network_device.memory_total),`,
    `    memUsage=avg(com.dynatrace.extension.network_device.memory_usage)`,
    `  }, by:{\`dt.entity.network:device\`}`,
    `  | fieldsAdd memPct = coalesce(`,
    `      arrayMax(memUsage),`,
    `      arrayMax(memUsed) / arrayMax(memTotal) * 100`,
    `    )`,
    `], sourceField:id, lookupField:\`dt.entity.network:device\`, prefix:"mem."`,
    `| lookup [`,
    `  fetch dt.davis.problems`,
    `  | expand affected_entity_ids`,
    `  | filter startsWith(affected_entity_ids, "CUSTOM_DEVICE")`,
    `  | summarize problems=countDistinct(display_id), by:{affected_entity_ids}`,
    `], sourceField:id, lookupField:affected_entity_ids, prefix:"p."`,
    `| fieldsAdd cpuPct = cpu.cpuMax, memPct = mem.memPct, problems = coalesce(p.problems, 0)`,
    `| fields id, deviceName, ip, deviceType, cpuPct, memPct, problems`,
    `| sort problems desc`,
  ].join('\n'),

  /** Interface health table — top interfaces by traffic */
  interfaceHealth: [
    `timeseries {`,
    `  ifInBytes = sum(com.dynatrace.extension.network_device.if.bytes_in.count),`,
    `  ifOutBytes = sum(com.dynatrace.extension.network_device.if.bytes_out.count)`,
    `}, by:{\`dt.entity.network:device\`, \`dt.entity.network:interface\`}`,
    `| fieldsAdd inTrafficBps = coalesce(arrayMax(ifInBytes), 0) * 8 / 300`,
    `| fieldsAdd outTrafficBps = coalesce(arrayMax(ifOutBytes), 0) * 8 / 300`,
    `| fieldsAdd inLoad = inTrafficBps / 1000000000 * 100`,
    `| fieldsAdd outLoad = outTrafficBps / 1000000000 * 100`,
    `| lookup [`,
    `  fetch \`dt.entity.network:device\` | fieldsAdd deviceName = entity.name`,
    `], sourceField:\`dt.entity.network:device\`, lookupField:id, prefix:"d."`,
    `| lookup [`,
    `  fetch \`dt.entity.network:interface\` | fieldsAdd interfaceName = entity.name`,
    `], sourceField:\`dt.entity.network:interface\`, lookupField:id, prefix:"if."`,
    `| lookup [`,
    `  timeseries status=avg(com.dynatrace.extension.network_device.if.status), by:{\`dt.entity.network:interface\`}`,
    `  | fieldsAdd currentStatus = arrayMax(status)`,
    `], sourceField:\`dt.entity.network:interface\`, lookupField:\`dt.entity.network:interface\`, prefix:"s."`,
    `| fieldsAdd ifStatus = if(toDouble(s.currentStatus) >= 1.0, "up", else: "down")`,
    `| lookup [`,
    `  timeseries {`,
    `    errIn=sum(com.dynatrace.extension.network_device.if.in.errors.count),`,
    `    errOut=sum(com.dynatrace.extension.network_device.if.out.errors.count),`,
    `    discIn=sum(com.dynatrace.extension.network_device.if.in.discards.count),`,
    `    discOut=sum(com.dynatrace.extension.network_device.if.out.discards.count)`,
    `  }, by:{\`dt.entity.network:interface\`}`,
    `  | fieldsAdd errorsIn = arraySum(errIn), errorsOut = arraySum(errOut)`,
    `  | fieldsAdd discardsIn = arraySum(discIn), discardsOut = arraySum(discOut)`,
    `], sourceField:\`dt.entity.network:interface\`, lookupField:\`dt.entity.network:interface\`, prefix:"e."`,
    `| fields \`dt.entity.network:interface\`, if.interfaceName, d.deviceName, ifStatus, inLoad, outLoad, inTrafficBps, outTrafficBps, e.errorsIn, e.errorsOut, e.discardsIn, e.discardsOut`,
    `| sort inTrafficBps desc`,
    `| limit 100`,
  ].join('\n'),

  /**
   * VPC flow analytics — top 5 origin VPC traffic timeseries.
   * Fields are pre-parsed by Dynatrace AWS log ingest — no parse content needed.
   * Available fields: aws.log_group, action, flow_direction, log_status,
   *   bytes, pkt_srcaddr, pkt_dstaddr, srcport, dstport, vpc_id, tgw_id,
   *   traffic_path, az_id, aws.region, cloud.region, packets, packets_lost_*
   * NOTE: FlowAnalytics.tsx builds dynamic queries with user-selected filters.
   */
  vpcFlowTraffic: [
    `fetch logs`,
    `| filter matchesValue(aws.log_group, "*flow-logs*")`,
    `| filter action == "ACCEPT"`,
    `| filter log_status == "OK"`,
    `| makeTimeseries Traffic = sum(toLong(bytes)), by:{vpc_id}`,
    `| fieldsRename \`Origin VPC\` = vpc_id`,
    `| sort arraySum(Traffic) desc`,
    `| limit 5`,
  ].join('\n'),

  /** VPC flow — top endpoint pairs (bidirectional, deduplicated) */
  vpcTopEndpoints: [
    `fetch logs`,
    `| filter matchesValue(aws.log_group, "*flow-logs*")`,
    `| filter action == "ACCEPT"`,
    `| filter log_status == "OK"`,
    `| fieldsAdd pair = if(pkt_srcaddr <= pkt_dstaddr, concat(pkt_srcaddr, " ⇄ ", pkt_dstaddr), else: concat(pkt_dstaddr, " ⇄ ", pkt_srcaddr))`,
    `| summarize Traffic = sum(toLong(bytes)), by:{pair, vpc_id}`,
    `| fieldsRename \`Endpoint pair\` = pair, \`Origin VPC\` = vpc_id`,
    `| sort Traffic desc`,
    `| limit 100`,
  ].join('\n'),

  /** VPC flow — top destination ports by traffic volume */
  vpcTopPorts: [
    `fetch logs`,
    `| filter matchesValue(aws.log_group, "*flow-logs*")`,
    `| filter action == "ACCEPT"`,
    `| filter log_status == "OK"`,
    `| summarize {Traffic = sum(toLong(bytes)), Flows = count()}, by:{dstport}`,
    `| fieldsRename \`Destination Port\` = dstport`,
    `| sort Traffic desc`,
    `| limit 10`,
  ].join('\n'),

  /** CPU usage per device */
  cpuUsage: [
    `timeseries cpuPerc=avg(com.dynatrace.extension.network_device.cpu_usage), by:{\`dt.entity.network:device\`}`,
  ].join('\n'),

  /** Memory usage per device */
  memoryUsage: [
    `timeseries {`,
    `  memUsed=sum(com.dynatrace.extension.network_device.memory_used),`,
    `  memFree=sum(com.dynatrace.extension.network_device.memory_free),`,
    `  memTotal=sum(com.dynatrace.extension.network_device.memory_total),`,
    `  memUsage=avg(com.dynatrace.extension.network_device.memory_usage)`,
    `}, by:{\`dt.entity.network:device\`}`,
  ].join('\n'),

  /** Network traffic per device */
  trafficPerDevice: [
    `fetch \`dt.entity.network:device\``,
    `| fieldsAdd deviceName = entity.name`,
    `| lookup [`,
    `  timeseries {`,
    `    ifInBytes = sum(com.dynatrace.extension.network_device.if.bytes_in.count),`,
    `    ifOutBytes = sum(com.dynatrace.extension.network_device.if.bytes_out.count)`,
    `  }, by:{\`dt.entity.network:device\`}`,
    `  | fieldsAdd totalBitsPerSec = (arrayMax(ifInBytes) + arrayMax(ifOutBytes)) * 8 / 300`,
    `], sourceField:id, lookupField:\`dt.entity.network:device\`, prefix:"t."`,
    `| fieldsAdd trafficBps = t.totalBitsPerSec`,
    `| fields id, deviceName, trafficBps`,
    `| sort trafficBps desc`,
  ].join('\n'),

  /** Interface up/down per device */
  interfaceUpDown: [
    `timeseries status = avg(com.dynatrace.extension.network_device.if.status),`,
    `  by:{\`dt.entity.network:device\`, \`dt.entity.network:interface\`}`,
    `| fieldsAdd currentStatus = arrayMax(status)`,
    `| fieldsAdd ifStatus = if(toDouble(currentStatus) >= 1.0, "up", else: "down")`,
    `| lookup [`,
    `  fetch \`dt.entity.network:device\` | fieldsAdd deviceName = entity.name`,
    `], sourceField:\`dt.entity.network:device\`, lookupField:id, prefix:"d."`,
    `| fieldsAdd deviceName = d.deviceName`,
    `| summarize upCount = countIf(ifStatus == "up"), downCount = countIf(ifStatus == "down"), by:{deviceName}`,
    `| sort downCount desc`,
  ].join('\n'),

  /** Topology — network device nodes with health, CPU, memory */
  topologyNodes: [
    `fetch \`dt.entity.network:device\``,
    `| fieldsAdd deviceName = entity.name`,
    `| fieldsAdd ip = entity.name`,
    `| fieldsAdd deviceType = ""`,
    `| lookup [`,
    `  timeseries cpuPerc=avg(com.dynatrace.extension.network_device.cpu_usage), by:{\`dt.entity.network:device\`}`,
    `  | fieldsAdd cpuMax = arrayMax(cpuPerc)`,
    `], sourceField:id, lookupField:\`dt.entity.network:device\`, prefix:"cpu."`,
    `| lookup [`,
    `  timeseries memUsage=avg(com.dynatrace.extension.network_device.memory_usage), by:{\`dt.entity.network:device\`}`,
    `  | fieldsAdd memMax = arrayMax(memUsage)`,
    `], sourceField:id, lookupField:\`dt.entity.network:device\`, prefix:"mem."`,
    `| lookup [`,
    `  fetch dt.davis.problems`,
    `  | expand affected_entity_ids`,
    `  | filter startsWith(affected_entity_ids, "CUSTOM_DEVICE")`,
    `  | filter status == "OPEN"`,
    `  | summarize problems=countDistinct(display_id), by:{affected_entity_ids}`,
    `], sourceField:id, lookupField:affected_entity_ids, prefix:"p."`,
    `| fieldsAdd cpuPct = cpu.cpuMax, memPct = mem.memMax, problems = coalesce(p.problems, 0)`,
    `| fields id, deviceName, ip, deviceType, cpuPct, memPct, problems`,
    `| limit 100`,
  ].join('\n'),

  /**
   * Topology — LLDP/CDP edges between devices.
   * NOTE: Requires connects_to relationship which is not available on the entity table.
   * Returns empty result set; topology relies on BGP edges instead.
   */
  topologyEdges: [
    `fetch \`dt.entity.network:device\``,
    `| limit 1`,
    `| filter id == "__NONE__"`,
    `| fieldsAdd sourceDevice = id, targetDevice = id, utilization = 0.0, bandwidth = 0.0`,
    `| fields sourceDevice, targetDevice, utilization, bandwidth`,
  ].join('\n'),

  /**
   * Topology — BGP peer edges between devices.
   * Joins BGP peer remote addresses back to device management IPs to find the
   * target device entity for each peering session.
   */
  topologyBgpEdges: [
    `timeseries bgpState = avg(com.dynatrace.extension.network_device.bgp.peer.state),`,
    `  by:{\`dt.entity.network:device\`, bgp.peer.remote_addr}`,
    `| fieldsAdd avgState = arrayAvg(bgpState)`,
    `| filter avgState > 0`,
    `| lookup [`,
    `  fetch \`dt.entity.network:device\``,
    `  | fieldsAdd mgmtIp = entity.name`,
    `  | fields id, mgmtIp`,
    `], sourceField:bgp.peer.remote_addr, lookupField:mgmtIp, prefix:"peer."`,
    `| filter isNotNull(peer.id)`,
    `| summarize bgpState = avg(avgState), by:{source = \`dt.entity.network:device\`, target = peer.id}`,
    `| fields source, target, bgpState`,
  ].join('\n'),

  /**
   * Topology — flow-based inferred edges between devices.
   * NOTE: Requires belongs_to/connects_to relationships which are not available
   * on the entity table. Returns empty result set; topology relies on BGP edges.
   */
  topologyFlowEdges: [
    `fetch \`dt.entity.network:device\``,
    `| limit 1`,
    `| filter id == "__NONE__"`,
    `| fieldsAdd source = id, target = id, traffic = 0.0`,
    `| fields source, target, traffic`,
  ].join('\n'),
} as const;
