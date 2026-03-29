// gateway/src/threat/detector.js
// Pure functions — no side effects, easy to test

function detectAnomaly(baseline, current) {

  // Spike: current traffic 10x above baseline
  if (baseline.avgRequestsPerMin > 0) {
    const ratio = current.requestsLastMin / baseline.avgRequestsPerMin;
    if (ratio > 10) {
      return { flagged: true, reason: 'TRAFFIC_SPIKE', severity: 'HIGH', ratio };
    }
  }

  // Absolute DDoS: over 500 req/min from single client
  if (current.requestsLastMin > 500) {
    return { flagged: true, reason: 'DDOS_PATTERN', severity: 'CRITICAL' };
  }

  // Endpoint scanning: hitting many different endpoints rapidly
  if (current.uniqueEndpointsLastMin?.length > 10) {
    return { flagged: true, reason: 'ENDPOINT_SCANNING', severity: 'MEDIUM' };
  }

  // Credential stuffing: mostly 401 errors
  if (current.errorRate401LastMin > 0.8) {
    return { flagged: true, reason: 'CREDENTIAL_STUFFING', severity: 'HIGH' };
  }

  // Off-hours access (2am-5am in client's normal timezone)
  const hour = new Date().getHours();
  if (baseline.usuallyActiveHours && !baseline.usuallyActiveHours.includes(hour)) {
    return { flagged: true, reason: 'OFF_HOURS_ACCESS', severity: 'LOW' };
  }

  return { flagged: false };
}

export default { detectAnomaly };