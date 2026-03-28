// gateway/src/middleware/geoBlock.js

// Simple geo blocking using ip-api.com (free, no key needed for dev)
const BLOCKED_COUNTRIES = (process.env.BLOCKED_COUNTRIES || '').split(',').filter(Boolean);

const cache = new Map(); // in-memory cache for geo lookups

export default async function geoBlockMiddleware(req, res, next) {
  // Skip if no countries configured to block
  if (BLOCKED_COUNTRIES.length === 0) return next();

  const ip = req.clientIP || req.ip;

  // Skip for localhost in development
  if (ip === '127.0.0.1' || ip === '::1') return next();

  let country;

  if (cache.has(ip)) {
    country = cache.get(ip);
  } else {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    const data = await res.json();
    country = data.countryCode;
    cache.set(ip, country); // cache in memory
  }

  req.countryCode = country;

  if (BLOCKED_COUNTRIES.includes(country)) {
    return res.status(403).json({
      error: 'REGION_BLOCKED',
      message: 'Service not available in your region'
    });
  }

  next();
};