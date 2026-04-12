import { jest } from '@jest/globals';

// jest.unstable_mockModule must be called before dynamic imports for ESM mocking
jest.unstable_mockModule('../../src/db/redis.js', () => ({
  default:          {},
  zRemRangeByScore: jest.fn().mockResolvedValue(1),
  zCard:            jest.fn().mockResolvedValue(0),
  zAdd:             jest.fn().mockResolvedValue(1),
  expire:           jest.fn().mockResolvedValue(1),
}));

let _zCard, _zRemRangeByScore, _zAdd, slidingWindowCheck;

beforeAll(async () => {
  const redis     = await import('../../src/db/redis.js');
  _zCard              = redis.zCard;
  _zRemRangeByScore   = redis.zRemRangeByScore;
  _zAdd               = redis.zAdd;

  const rateLimit     = await import('../../src/middleware/rateLimit.js');
  slidingWindowCheck  = rateLimit.slidingWindowCheck;
});

describe('Sliding Window Rate Limiter', () => {

  beforeEach(() => jest.clearAllMocks());

  test('allows request when count is under limit', async () => {
    _zCard.mockResolvedValue(40); // 40 of 100 used
    const result = await slidingWindowCheck('client_a', 100);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(41);
  });

  test('blocks request when count equals limit', async () => {
    _zCard.mockResolvedValue(100);
    const result = await slidingWindowCheck('client_b', 100);
    expect(result.allowed).toBe(false);
  });

  test('blocks request when count exceeds limit', async () => {
    _zCard.mockResolvedValue(250);
    const result = await slidingWindowCheck('client_c', 100);
    expect(result.allowed).toBe(false);
  });

  test('calls zRemRangeByScore with correct key', async () => {
    _zCard.mockResolvedValue(5);
    await slidingWindowCheck('client_d', 100);
    expect(_zRemRangeByScore).toHaveBeenCalledWith(
      'ratelimit:client_d', 0, expect.any(Number)
    );
  });

  test('calls zAdd when request is allowed', async () => {
    _zCard.mockResolvedValue(5);
    await slidingWindowCheck('client_e', 100);
    expect(_zAdd).toHaveBeenCalled();
  });

  test('does NOT call zAdd when request is blocked', async () => {
    _zCard.mockResolvedValue(100);
    await slidingWindowCheck('client_f', 100);
    expect(_zAdd).not.toHaveBeenCalled();
  });

  test('respects custom rate limit per client', async () => {
    _zCard.mockResolvedValue(499);
    const result = await slidingWindowCheck('client_enterprise', 500);
    expect(result.allowed).toBe(true);

    _zCard.mockResolvedValue(500);
    const blocked = await slidingWindowCheck('client_enterprise', 500);
    expect(blocked.allowed).toBe(false);
  });

});
