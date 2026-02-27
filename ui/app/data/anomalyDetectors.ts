import type { AnomalyDetectorRule, AnomalyDetectorStatus, AnomalyDetectorCategory } from '../types/network';

/**
 * Curated set of 18 generic Davis Anomaly Detector rules for network
 * observability.  Derived from real-world production configurations and
 * generalized (no customer-specific entities, SNMP extension namespaces,
 * or vendor-locked metric keys).
 *
 * Categories:
 *   device-health     — CPU, memory, PSU, temperature, reachability
 *   interface-health  — link status, utilization, errors, flapping
 *   routing           — BGP, EIGRP protocol health
 *   security          — authentication failures
 *   discovery         — new device detection
 *   syslog            — syslog-based alerting
 */

/* ================================================================
 *  ANOMALY DETECTOR RULES
 * ================================================================ */
export const ANOMALY_DETECTORS: AnomalyDetectorRule[] = [
  /* ── Device Health ──────────────────────────────── */
  {
    id: 'ad-cpu-busy',
    title: 'Network Device — CPU Busy Alert',
    description:
      'Fires when a network device CPU utilization exceeds the threshold, indicating the control plane may be under stress. High CPU can cause route convergence delays and packet drops.',
    category: 'device-health',
    severity: 'info',
    enabled: true,
    query: [
      'timeseries cpuPerc = avg(com.dynatrace.extension.network_device.cpu_usage),',
      '  by: { dt.entity.network:device },',
      '  interval: 1m',
    ].join('\n'),
    threshold: 80,
    alertCondition: 'ABOVE',
    slidingWindow: 5,
    violatingSamples: 3,
    dealertingSamples: 5,
    eventTitlePattern: 'Network Device — CPU Load Alert — {device.name}',
    eventDescriptionPattern:
      'CPU utilization on {device.name} ({device.address}) exceeded {threshold}% for {violating_samples} of {sliding_window} samples.',
    isMergingAllowed: true,
    relatedCategories: ['saturation'],
    nocGuidance:
      'Investigate top processes (show proc cpu). Check for routing storms, ACL complexity, or excessive SNMP polling. Consider control-plane policing (CoPP).',
  },
  {
    id: 'ad-memory-usage',
    title: 'Network Device — Memory Usage Alert',
    description:
      'Fires when device memory consumption exceeds the threshold. Memory pressure can prevent new sessions, cause crashes or watchdog resets.',
    category: 'device-health',
    severity: 'major',
    enabled: true,
    query: [
      'timeseries memPct = avg(com.dynatrace.extension.network_device.memory_usage),',
      '  by: { dt.entity.network:device },',
      '  interval: 1m',
    ].join('\n'),
    threshold: 85,
    alertCondition: 'ABOVE',
    slidingWindow: 5,
    violatingSamples: 3,
    dealertingSamples: 5,
    eventTitlePattern: 'Device Memory Alert — {device.name}',
    eventDescriptionPattern:
      'Memory utilization on {device.name} exceeded {threshold}%. Check for memory leaks, BGP table growth, or excessive logging buffers.',
    isMergingAllowed: true,
    relatedCategories: ['saturation'],
    nocGuidance:
      'Check memory pools (show memory summary). Look for BGP table explosions, ARP cache overflows, or logging buffer exhaustion. Schedule reload if critical.',
  },
  {
    id: 'ad-device-unavailable',
    title: 'Network Device — Device Unavailable Alert',
    description:
      'Fires when a device stops responding to SNMP polling, synthetic checks, or both. Indicates a hard failure, power loss, or network partition.',
    category: 'device-health',
    severity: 'critical',
    enabled: true,
    query: [
      'fetch dt.system.events',
      '| filter event.type == "SFM"',
      '| fieldsAdd device.address, timestamp',
      '| makeTimeseries count(), by:{ device.address }, interval: 1m',
    ].join('\n'),
    threshold: 0,
    alertCondition: 'ABOVE',
    slidingWindow: 5,
    violatingSamples: 3,
    dealertingSamples: 5,
    eventTitlePattern: 'Network Device — Device Unavailable Alert {device.address}',
    eventDescriptionPattern:
      'Device at {device.address} is unresponsive. SNMP polling has failed for {violating_samples} consecutive intervals.',
    isMergingAllowed: false,
    relatedCategories: ['reachability'],
    nocGuidance:
      'Verify physical connectivity (power, cables). Check upstream device/interface status. Attempt out-of-band management access (console, iLO). Initiate remote-hands if needed.',
  },
  {
    id: 'ad-psu-state',
    title: 'Network Device — PSU Not Normal State Alert',
    description:
      'Fires when a power supply unit reports a non-normal state (failed, degraded, absent). Critical for hardware resilience.',
    category: 'device-health',
    severity: 'major',
    enabled: true,
    query: [
      'timeseries psuState = avg(com.dynatrace.extension.network_device.psu.status),',
      '  by: { dt.entity.network:device },',
      '  interval: 1m',
    ].join('\n'),
    threshold: 0,
    alertCondition: 'ABOVE',
    slidingWindow: 3,
    violatingSamples: 1,
    dealertingSamples: 3,
    eventTitlePattern: 'Network Device — PSU {psu.label} in state {psu.status} on {device.name}',
    eventDescriptionPattern:
      'Power supply unit on {device.name} is not in a normal operational state. Redundancy may be compromised.',
    isMergingAllowed: false,
    relatedCategories: ['reachability'],
    nocGuidance:
      'Log a hardware RMA with the vendor. If the device has dual PSU, verify the remaining PSU is healthy. Plan a maintenance window for replacement.',
  },
  {
    id: 'ad-fan-temperature',
    title: 'Network Device — Temperature Alert',
    description:
      'Fires when device temperature sensors report values above safe operating thresholds. Overheating causes component failure and unexpected shutdowns.',
    category: 'device-health',
    severity: 'major',
    enabled: true,
    query: [
      'timeseries temp = avg(com.dynatrace.extension.network_device.temperature),',
      '  by: { dt.entity.network:device },',
      '  interval: 1m',
    ].join('\n'),
    threshold: 65,
    alertCondition: 'ABOVE',
    slidingWindow: 5,
    violatingSamples: 3,
    dealertingSamples: 5,
    eventTitlePattern: 'Network Device — Temperature Alert — {device.name}',
    eventDescriptionPattern:
      'Temperature on {device.name} exceeded {threshold}°C. Check environmental conditions, fan status, and airflow.',
    isMergingAllowed: false,
    relatedCategories: ['reachability'],
    nocGuidance:
      'Verify datacenter cooling (CRAC units, hot/cold aisle containment). Check fan status on the device. If ambient temp is normal, suspect a failed fan tray.',
  },

  /* ── Interface Health ───────────────────────────── */
  {
    id: 'ad-interface-down',
    title: 'Network Device — Interface Down Alert',
    description:
      'Fires when a monitored interface enters operational-down or dormant state. Detects link failures, fiber cuts, and upstream port shutdowns.',
    category: 'interface-health',
    severity: 'critical',
    enabled: true,
    query: [
      'timeseries value = avg(com.dynatrace.extension.network_device.if.status),',
      '  by: { dt.entity.network:interface, dt.entity.network:device },',
      '  filter: { NOT matchesValue(if.operstatus, "up(1)") },',
      '  interval: 1m',
    ].join('\n'),
    threshold: 0,
    alertCondition: 'ABOVE',
    slidingWindow: 3,
    violatingSamples: 1,
    dealertingSamples: 3,
    eventTitlePattern: 'Network Device — Interface Down Alert — {device.name} {if.name}',
    eventDescriptionPattern:
      'Interface {if.name} on {device.name} ({device.address}) is operationally down. Status: {if.operstatus}.',
    isMergingAllowed: true,
    relatedCategories: ['reachability', 'errors'],
    nocGuidance:
      'Check physical cable, SFP module, and remote end. Run "show interface" for error counters. If flapping, consider dampening. If admin-down, verify change ticket.',
  },
  {
    id: 'ad-interface-admin-down',
    title: 'Network Device — Interface Administrator Down',
    description:
      'Fires when an interface is administratively disabled. Used to track intentional shutdowns and detect unauthorized changes.',
    category: 'interface-health',
    severity: 'critical',
    enabled: true,
    query: [
      'timeseries status = avg(com.dynatrace.extension.network_device.if.status),',
      '  by: { dt.entity.network:interface, dt.entity.network:device },',
      '  filter: { admin.status == "down(2)" },',
      '  interval: 1m',
    ].join('\n'),
    threshold: 0,
    alertCondition: 'ABOVE',
    slidingWindow: 5,
    violatingSamples: 3,
    dealertingSamples: 5,
    eventTitlePattern: 'Network Device — Interface Admin Down {device.name} {interface.name}',
    eventDescriptionPattern:
      'Interface {interface.name} on {device.name} is in Administrator Down state. Verify this matches an approved change request.',
    isMergingAllowed: true,
    relatedCategories: ['reachability'],
    nocGuidance:
      'Cross-reference with ITSM change tickets. If no approved change exists, escalate as a potential unauthorized configuration change.',
  },
  {
    id: 'ad-interface-flapping',
    title: 'Network Device — Interface Flapping Alert',
    description:
      'Fires when an interface experiences rapid up/down transitions. Flapping degrades routing convergence and can propagate instability across the network.',
    category: 'interface-health',
    severity: 'critical',
    enabled: true,
    query: [
      'timeseries flapping = sum(device.flapping),',
      '  by: { dt.entity.network:device },',
      '  interval: 1m',
    ].join('\n'),
    threshold: 1,
    alertCondition: 'ABOVE',
    slidingWindow: 3,
    violatingSamples: 1,
    dealertingSamples: 3,
    eventTitlePattern: 'Network Device — Flapping Alert {device.address}',
    eventDescriptionPattern:
      'Interface flapping detected on {device.address}. Rapid link state changes are occurring which can destabilize routing.',
    isMergingAllowed: true,
    relatedCategories: ['errors', 'reachability'],
    nocGuidance:
      'Apply interface dampening ("dampening" IOS command). Check physical layer (cable, SFP, optical power levels). Investigate for duplex mismatches or speed auto-negotiation issues.',
  },
  {
    id: 'ad-high-interface-util',
    title: 'Network Device — High Interface Utilization Alert',
    description:
      'Fires when interface bandwidth utilization exceeds the threshold. Indicates capacity exhaustion and risk of congestion-related packet loss.',
    category: 'interface-health',
    severity: 'critical',
    enabled: true,
    query: [
      'timeseries {',
      '  inOctets = sum(com.dynatrace.extension.network_device.if.bytes_in.count),',
      '  outOctets = sum(com.dynatrace.extension.network_device.if.bytes_out.count)',
      '}, by: { dt.entity.network:interface, dt.entity.network:device }, interval: 1m',
      '| fieldsAdd inBps = inOctets[] * 8 / 60',
      '| fieldsAdd outBps = outOctets[] * 8 / 60',
      '| fieldsAdd totalBps = inBps[] + outBps[]',
    ].join('\n'),
    threshold: 50,
    alertCondition: 'ABOVE',
    slidingWindow: 3,
    violatingSamples: 1,
    dealertingSamples: 3,
    eventTitlePattern: 'Network Device — High Interface Utilization {device.name}',
    eventDescriptionPattern:
      'Interface utilization on {device.name} exceeded {threshold}%. Network Device: {device.address}, Type: {device.type}.',
    isMergingAllowed: false,
    relatedCategories: ['saturation', 'traffic'],
    nocGuidance:
      'Identify top talkers using flow data. Consider QoS policies to prioritize critical traffic. Plan capacity upgrade if sustained. Check for DDoS or traffic anomalies.',
  },
  {
    id: 'ad-crc-errors',
    title: 'Network Device — CRC Error Alert',
    description:
      'Fires when CRC (Cyclic Redundancy Check) errors exceed the threshold. CRC errors indicate physical layer issues: bad cables, failing SFPs, or electrical interference.',
    category: 'interface-health',
    severity: 'major',
    enabled: true,
    query: [
      'timeseries crcErrors = sum(com.dynatrace.extension.network_device.if.in.crc_errors.count),',
      '  by: { dt.entity.network:interface, dt.entity.network:device },',
      '  interval: 1m',
      '| filter arrayAvg(crcErrors) > 0',
    ].join('\n'),
    threshold: 100,
    alertCondition: 'ABOVE',
    slidingWindow: 5,
    violatingSamples: 3,
    dealertingSamples: 5,
    eventTitlePattern: 'Network Device — CRC Alert {device.address}',
    eventDescriptionPattern:
      'CRC errors detected on {device.name} interface {if.name}. Count exceeded {threshold}. This indicates physical layer degradation.',
    isMergingAllowed: true,
    relatedCategories: ['errors'],
    nocGuidance:
      'Replace cable/patch cord. Check SFP optical power (show transceiver). Verify duplex/speed settings match remote end. Test for electromagnetic interference.',
  },
  {
    id: 'ad-outbound-discards',
    title: 'Network Device — Interface Outbound Discards Alert',
    description:
      'Fires when outbound packet discards exceed the threshold. Discards indicate output queue congestion, QoS drops, or buffer exhaustion.',
    category: 'interface-health',
    severity: 'major',
    enabled: true,
    query: [
      'timeseries discards = avg(com.dynatrace.extension.network_device.if.out.discards.count, rate:1s),',
      '  by: { dt.entity.network:interface, dt.entity.network:device },',
      '  interval: 1m',
      '| filter arrayAvg(discards) > 10',
    ].join('\n'),
    threshold: 60000,
    alertCondition: 'ABOVE',
    slidingWindow: 3,
    violatingSamples: 1,
    dealertingSamples: 3,
    eventTitlePattern: 'Network Device — Interface Outbound Discards {device.address}',
    eventDescriptionPattern:
      'Outbound discards on {device.name} interface {if.name} exceeded {threshold}. Queue congestion likely.',
    isMergingAllowed: true,
    relatedCategories: ['errors', 'saturation'],
    nocGuidance:
      'Review QoS queue depths and scheduling policies. Identify top talkers causing congestion. Increase interface speed or spread load across LAG members.',
  },

  /* ── Routing Protocol ───────────────────────────── */
  {
    id: 'ad-bgp-peer-state',
    title: 'Network Device — BGP Peer State Alert',
    description:
      'Fires when a BGP peer drops out of the "established" state. BGP session loss can cause route withdrawal, traffic blackholing, and internet reachability loss.',
    category: 'routing',
    severity: 'critical',
    enabled: true,
    query: [
      'timeseries bgpState = avg(com.dynatrace.extension.network_device.bgp.peer.state),',
      '  by: { dt.entity.network:device, bgp.peer.state, bgp.remote.as },',
      '  filter: { NOT matchesValue(bgp.peer.state, "established(6)") },',
      '  interval: 1m',
    ].join('\n'),
    threshold: 6,
    alertCondition: 'BELOW',
    slidingWindow: 5,
    violatingSamples: 3,
    dealertingSamples: 5,
    eventTitlePattern: 'Network Device — BGP Peer State Alert — {device.name}',
    eventDescriptionPattern:
      'BGP peer on {device.name} ({device.address}) is not in established state. Peer state: {bgp.peer.state}, Remote AS: {bgp.remote.as}.',
    isMergingAllowed: false,
    relatedCategories: ['reachability', 'traffic'],
    nocGuidance:
      'Check "show bgp summary". Verify neighbor IP, ASN, and MD5 authentication. Check for MTU issues on the peering link. Review route-map/prefix-list changes.',
  },
  {
    id: 'ad-eigrp-peer-response',
    title: 'Network Device — EIGRP Peer Response Time Alert',
    description:
      'Fires when EIGRP peer round-trip time (SRTT) exceeds acceptable levels. High latency can trigger EIGRP stuck-in-active (SIA) conditions and route churn.',
    category: 'routing',
    severity: 'critical',
    enabled: true,
    query: [
      'timeseries eigrpSrtt = avg(com.dynatrace.extension.network_device.eigrp.peer.srtt),',
      '  by: { dt.entity.network:device, eigrp.peer.addr },',
      '  interval: 1m',
    ].join('\n'),
    threshold: 200,
    alertCondition: 'ABOVE',
    slidingWindow: 5,
    violatingSamples: 3,
    dealertingSamples: 5,
    eventTitlePattern: 'Network Device — EIGRP Peer Response Time Alert {device.name}',
    eventDescriptionPattern:
      'EIGRP peer response time on {device.name} to {eigrp.peer.addr} exceeded {threshold}ms. Risk of SIA condition.',
    isMergingAllowed: true,
    relatedCategories: ['reachability'],
    nocGuidance:
      'Check path latency to the EIGRP peer. Verify no packet loss or congestion on the peering link. Review EIGRP hold/hello timers. Consider tuning SIA timer.',
  },

  /* ── Security ───────────────────────────────────── */
  {
    id: 'ad-auth-failures',
    title: 'Network Device — Authentication Failures',
    description:
      'Fires when authentication failure events are detected on network devices. Could indicate brute-force attacks, misconfigured credentials, or unauthorized access attempts.',
    category: 'security',
    severity: 'critical',
    enabled: true,
    query: [
      'fetch logs',
      '| filter isNull(log.source)',
      '  AND matchesValue(content, "*authentication*")',
      '  AND matchesValue(content, "*fail*")',
      '| fieldsAdd dt.entity.network:device, dt.ingest.source.ip',
      '| makeTimeseries count(), by:{dt.entity.network:device}, interval: 1m',
    ].join('\n'),
    threshold: 0,
    alertCondition: 'ABOVE',
    slidingWindow: 3,
    violatingSamples: 1,
    dealertingSamples: 3,
    eventTitlePattern: 'Network Device — Authentication Failures {device.name}',
    eventDescriptionPattern:
      'Authentication failures detected on {device.name}. This could indicate misconfigured credentials or unauthorized access attempts.',
    isMergingAllowed: false,
    relatedCategories: ['global'],
    nocGuidance:
      'Check TACACS+/RADIUS logs for source IP. If brute-force suspected, apply ACLs. Verify AAA configuration. If legitimate, reset credentials and update password vaults.',
  },

  /* ── Discovery & Inventory ──────────────────────── */
  {
    id: 'ad-new-device',
    title: 'Network Device — New Device Detected',
    description:
      'Fires when SNMP auto-discovery detects a previously unknown network device. Important for inventory tracking and unauthorized device detection.',
    category: 'discovery',
    severity: 'info',
    enabled: true,
    query: [
      'fetch logs',
      '| filter matchesValue(log.source, "snmp_autodiscovery")',
      '| filter content == "Device discovery"',
      '| fields dt.entity.network:device, device.address, device.type, sys.name, timestamp',
      '| makeTimeseries count(), by:{ dt.entity.network:device, device.address, device.type, sys.name }, interval: 1m',
    ].join('\n'),
    threshold: 0,
    alertCondition: 'ABOVE',
    slidingWindow: 1,
    violatingSamples: 1,
    dealertingSamples: 1,
    eventTitlePattern: 'Network Device — New Device Detected {device.address}',
    eventDescriptionPattern:
      'New device discovered at {device.address}. Type: {device.type}, System Name: {sys.name}.',
    isMergingAllowed: true,
    relatedCategories: ['global'],
    nocGuidance:
      'Verify the device is authorized. Add to CMDB and monitoring. If unauthorized, quarantine the port and escalate to the security team.',
  },

  /* ── Syslog ─────────────────────────────────────── */
  {
    id: 'ad-syslog-severity',
    title: 'Syslog — Severity Alert',
    description:
      'Fires when syslog messages at or above a critical severity level are received. Catches device emergencies, alerts, and critical conditions reported via syslog.',
    category: 'syslog',
    severity: 'major',
    enabled: true,
    query: [
      'fetch logs',
      '| filter isNull(log.source)',
      '| fieldsAdd dt.ingest.source.ip, severity, facility, interface, interfaceMessage',
      '| makeTimeseries count(), by:{ dt.ingest.source.ip, severity }, interval: 1m',
    ].join('\n'),
    threshold: 0,
    alertCondition: 'ABOVE',
    slidingWindow: 3,
    violatingSamples: 1,
    dealertingSamples: 3,
    eventTitlePattern: 'Syslog — Severity Alert {severity}',
    eventDescriptionPattern:
      'Syslog severity threshold reached for device {dt.ingest.source.ip}. Severity: {severity}.',
    isMergingAllowed: true,
    relatedCategories: ['global', 'errors'],
    nocGuidance:
      'Review the syslog message content. Severity 0-2 (Emergency/Alert/Critical) always requires immediate action. Correlate with other device alerts.',
  },
  {
    id: 'ad-duplicate-address',
    title: 'Syslog — Duplicate Address Alert',
    description:
      'Fires when a duplicate IP address is detected on the network. IP conflicts cause intermittent connectivity, ARP cache poisoning, and user complaints.',
    category: 'syslog',
    severity: 'major',
    enabled: true,
    query: [
      'fetch logs',
      '| filter isNull(log.source)',
      '  AND matchesValue(content, "*duplicate*address*")',
      '| fieldsAdd dt.ingest.source.ip, duplicate.address',
      '| makeTimeseries count(), by:{ dt.ingest.source.ip, duplicate.address }, interval: 1m',
    ].join('\n'),
    threshold: 0,
    alertCondition: 'ABOVE',
    slidingWindow: 3,
    violatingSamples: 1,
    dealertingSamples: 3,
    eventTitlePattern: 'Syslog — Duplicate Address Alert',
    eventDescriptionPattern:
      'Duplicate address detected by {dt.ingest.source.ip}. Conflicting address: {duplicate.address}.',
    isMergingAllowed: true,
    relatedCategories: ['reachability'],
    nocGuidance:
      'Identify both MAC addresses claiming the IP (show arp, show mac address-table). Track to the switch ports. If DHCP, check for rogue DHCP servers.',
  },
  {
    id: 'ad-err-disabled',
    title: 'Syslog — Err-Disabled Alert',
    description:
      'Fires when a switch port enters err-disabled state due to security violations, BPDU guard, or storm control. The port is effectively shut down.',
    category: 'syslog',
    severity: 'critical',
    enabled: true,
    query: [
      'fetch logs',
      '| filter isNull(log.source)',
      '  AND matchesValue(content, "*err-disable*")',
      '  AND NOT matchesValue(content, "*flapping*")',
      '| fieldsAdd dt.ingest.source.ip, interface, event, facility, severity',
      '| makeTimeseries count(), by:{ dt.ingest.source.ip, interface }, interval: 1m',
    ].join('\n'),
    threshold: 0,
    alertCondition: 'ABOVE',
    slidingWindow: 3,
    violatingSamples: 1,
    dealertingSamples: 3,
    eventTitlePattern: 'Syslog — Err-Disabled Alert — Non-Flapping',
    eventDescriptionPattern:
      'Port err-disabled on {dt.ingest.source.ip} interface {interface}. Event: {event}, Facility: {facility}.',
    isMergingAllowed: true,
    relatedCategories: ['errors', 'reachability'],
    nocGuidance:
      'Identify the err-disable reason (show errdisable recovery). Common causes: BPDU guard (STP loop), port-security violation, storm-control. Fix root cause before re-enabling.',
  },
];

/* ── Category metadata for display ─────────────────── */
export const ANOMALY_CATEGORY_META: Record<AnomalyDetectorCategory, { icon: string; label: string; color: string }> = {
  'device-health':    { icon: '🖥️', label: 'Device Health',     color: '#73b1ff' },
  'interface-health': { icon: '🔌', label: 'Interface Health',   color: '#b388ff' },
  'routing':          { icon: '🛤️', label: 'Routing Protocol',   color: '#ffd54f' },
  'security':         { icon: '🔒', label: 'Security',           color: '#ef5350' },
  'discovery':        { icon: '🔍', label: 'Discovery',          color: '#4dd0e1' },
  'syslog':           { icon: '📋', label: 'Syslog',             color: '#ff8a65' },
};

/* ── Severity metadata ─────────────────────────────── */
export const SEVERITY_META: Record<string, { color: string; bg: string; label: string; order: number }> = {
  critical: { color: '#dc172a', bg: 'rgba(220,23,42,0.12)', label: 'CRITICAL', order: 0 },
  major:    { color: '#fd8232', bg: 'rgba(253,130,50,0.12)', label: 'MAJOR',    order: 1 },
  minor:    { color: '#f5d30f', bg: 'rgba(245,211,15,0.12)', label: 'MINOR',    order: 2 },
  info:     { color: '#73b1ff', bg: 'rgba(115,177,255,0.12)', label: 'INFO',    order: 3 },
};

/* ── Demo statuses for each detector ───────────────── */
const now = Date.now();
function ago(mins: number): Date { return new Date(now - mins * 60_000); }

export const DEMO_DETECTOR_STATUSES: AnomalyDetectorStatus[] = [
  { detectorId: 'ad-cpu-busy',           firingCount: 1,  lastFired: ago(18),  status: 'FIRING' },
  { detectorId: 'ad-memory-usage',       firingCount: 2,  lastFired: ago(12),  status: 'FIRING' },
  { detectorId: 'ad-device-unavailable', firingCount: 1,  lastFired: ago(5),   status: 'FIRING' },
  { detectorId: 'ad-psu-state',          firingCount: 0,                       status: 'OK' },
  { detectorId: 'ad-fan-temperature',    firingCount: 0,                       status: 'OK' },
  { detectorId: 'ad-interface-down',     firingCount: 3,  lastFired: ago(5),   status: 'FIRING' },
  { detectorId: 'ad-interface-admin-down', firingCount: 1, lastFired: ago(45), status: 'FIRING' },
  { detectorId: 'ad-interface-flapping', firingCount: 1,  lastFired: ago(30),  status: 'FIRING' },
  { detectorId: 'ad-high-interface-util', firingCount: 2, lastFired: ago(8),   status: 'FIRING' },
  { detectorId: 'ad-crc-errors',         firingCount: 0,                       status: 'OK' },
  { detectorId: 'ad-outbound-discards',  firingCount: 1,  lastFired: ago(15),  status: 'FIRING' },
  { detectorId: 'ad-bgp-peer-state',     firingCount: 0,                       status: 'OK' },
  { detectorId: 'ad-eigrp-peer-response', firingCount: 0,                      status: 'OK' },
  { detectorId: 'ad-auth-failures',      firingCount: 0,                       status: 'OK' },
  { detectorId: 'ad-new-device',         firingCount: 0,                       status: 'OK' },
  { detectorId: 'ad-syslog-severity',    firingCount: 0,                       status: 'OK' },
  { detectorId: 'ad-duplicate-address',  firingCount: 0,                       status: 'OK' },
  { detectorId: 'ad-err-disabled',       firingCount: 0,                       status: 'OK' },
];
