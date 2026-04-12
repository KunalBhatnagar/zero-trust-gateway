import { detectAnomaly } from '../../src/threat/detector.js';

describe('Anomaly Detector', () => {

  test('flags traffic spike when current is 10x above baseline', () => {
    const result = detectAnomaly(
      { avgRequestsPerMin: 10 },
      { requestsLastMin: 120, errorRate401LastMin: 0 }
    );
    expect(result.flagged).toBe(true);
    expect(result.reason).toBe('TRAFFIC_SPIKE');
    expect(result.severity).toBe('HIGH');
  });

  test('flags DDoS pattern when over 500 req/min absolute', () => {
    const result = detectAnomaly(
      { avgRequestsPerMin: 10 },
      { requestsLastMin: 600, errorRate401LastMin: 0 }
    );
    expect(result.flagged).toBe(true);
    expect(result.reason).toBe('DDOS_PATTERN');
    expect(result.severity).toBe('CRITICAL');
  });

  test('flags credential stuffing when 401 rate above 80%', () => {
    const result = detectAnomaly(
      { avgRequestsPerMin: 5 },
      { requestsLastMin: 50, errorRate401LastMin: 0.85 }
    );
    expect(result.flagged).toBe(true);
    expect(result.reason).toBe('CREDENTIAL_STUFFING');
    expect(result.severity).toBe('HIGH');
  });

  test('flags endpoint scanning when 10+ unique endpoints hit', () => {
    const endpoints = Array.from({ length: 12 }, (_, i) => `/api/route${i}`);
    const result = detectAnomaly(
      { avgRequestsPerMin: 5 },
      { requestsLastMin: 12, errorRate401LastMin: 0, uniqueEndpointsLastMin: endpoints }
    );
    expect(result.flagged).toBe(true);
    expect(result.reason).toBe('ENDPOINT_SCANNING');
    expect(result.severity).toBe('MEDIUM');
  });

  test('does NOT flag normal traffic', () => {
    const result = detectAnomaly(
      { avgRequestsPerMin: 50 },
      { requestsLastMin: 52, errorRate401LastMin: 0.01 }
    );
    expect(result.flagged).toBe(false);
  });

  test('does not crash when baseline is zero (new client)', () => {
    const result = detectAnomaly(
      { avgRequestsPerMin: 0 },
      { requestsLastMin: 5, errorRate401LastMin: 0 }
    );
    expect(result).toBeDefined();
    expect(result.flagged).toBe(false);
  });

  test('includes ratio in spike result', () => {
    const result = detectAnomaly(
      { avgRequestsPerMin: 10 },
      { requestsLastMin: 500, errorRate401LastMin: 0 }
    );
    expect(result.flagged).toBe(true);
    expect(result.ratio).toBeGreaterThan(10);
  });

});