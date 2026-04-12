import jwt from 'jsonwebtoken';
const { verify, sign } = jwt;

const SECRET = 'unit_test_secret';

// Extracted auth logic for unit testing (pure function)
function validateJWT(token, secret, requiredScope = null) {
  try {
    const payload = verify(token, secret);
    if (requiredScope && !(payload.scopes || []).includes(requiredScope)) {
      return { valid: false, error: 'INSUFFICIENT_SCOPE' };
    }
    return { valid: true, payload };
  } catch (err) {
    if (err.name === 'TokenExpiredError') return { valid: false, error: 'TOKEN_EXPIRED' };
    return { valid: false, error: 'INVALID_TOKEN' };
  }
}

describe('JWT Validation', () => {

  test('accepts a valid non-expired token', () => {
    const token  = sign({ userId: 'u_1', scopes: ['read:users'] }, SECRET, { expiresIn: '1h' });
    const result = validateJWT(token, SECRET);
    expect(result.valid).toBe(true);
    expect(result.payload.userId).toBe('u_1');
  });

  test('rejects a token signed with wrong secret', () => {
    const token  = sign({ userId: 'u_1' }, 'wrong_secret');
    const result = validateJWT(token, SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_TOKEN');
  });

  test('rejects a tampered token', () => {
    const token   = sign({ userId: 'u_1' }, SECRET);
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result  = validateJWT(tampered, SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_TOKEN');
  });

  test('rejects an expired token', done => {
    const token = sign({ userId: 'u_1' }, SECRET, { expiresIn: '1ms' });
    setTimeout(() => {
      const result = validateJWT(token, SECRET);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOKEN_EXPIRED');
      done();
    }, 50);
  });

  test('rejects token missing required scope', () => {
    const token  = sign({ userId: 'u_1', scopes: ['read:users'] }, SECRET);
    const result = validateJWT(token, SECRET, 'write:payments');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_SCOPE');
  });

  test('accepts token with required scope present', () => {
    const token  = sign({ userId: 'u_1', scopes: ['read:users', 'write:payments'] }, SECRET);
    const result = validateJWT(token, SECRET, 'write:payments');
    expect(result.valid).toBe(true);
  });

  test('accepts token with no scope requirement', () => {
    const token  = sign({ userId: 'u_1' }, SECRET);
    const result = validateJWT(token, SECRET);  // no requiredScope passed
    expect(result.valid).toBe(true);
  });

});