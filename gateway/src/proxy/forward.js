// gateway/src/proxy/forward.js

import { createProxyMiddleware } from 'http-proxy-middleware';

const proxy = createProxyMiddleware({
  target: process.env.UPSTREAM_URL || 'http://localhost:8080',
  changeOrigin: true,

  on: {
    // Before forwarding the request
    proxyReq: (proxyReq, req, res) => {
      // Attach original IP as header so upstream knows real caller
      proxyReq.setHeader('X-Real-IP', req.ip);
      proxyReq.setHeader('X-Forwarded-By', 'zero-trust-gateway');
    },

    // After getting response from upstream
    proxyRes: (proxyRes, req, res) => {
      const duration = Date.now() - req.startTime;
      console.log(`→ ${req.method} ${req.path} ${proxyRes.statusCode} (${duration}ms)`);
    },

    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ error: 'UPSTREAM_UNAVAILABLE' });
    }
  }
});

// Middleware that records start time then proxies
export default (req, res, next) => {
  req.startTime = Date.now();
  proxy(req, res, next);
};