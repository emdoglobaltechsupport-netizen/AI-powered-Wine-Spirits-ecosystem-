import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { attachAuth } from './middleware/auth.js';
import { requestId } from './middleware/request.js';
import { apiVersion } from './middleware/version.js';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import { auditRequests } from './middleware/audit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { tooMany } from './lib/errors.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { ageRouter } from './modules/age/age.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { commerceSafeguardsRouter } from './modules/commerce/commerce-safeguards.routes.js';
import { checkoutRouter } from './modules/checkout/checkout.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { privacyControlsRouter } from './modules/privacy/privacy-controls.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { systemRouter } from './modules/system/system.routes.js';
import { simulationRouter } from './modules/simulations/simulation.routes.js';

export const app = express();

const prototypeDir = fileURLToPath(new URL('../../../apps/prototype/', import.meta.url));
const indexPath = `${prototypeDir}index.html`;

app.disable('x-powered-by');
app.use(cors({
  origin: config.WEB_ORIGIN.split(',').map((s) => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '64kb' }));
app.use(requestId);
app.use(attachAuth);

// CodeQL-recognised baseline limiter. It is installed before every route,
// including the static SPA fallback, so expensive handlers share one cap.
// Production still requires the distributed limiter documented in API_POLICY.md.
const limiter = expressRateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(tooMany('Rate limit exceeded'));
  },
});
app.use(limiter);

// All /v1 traffic carries the version header and structured audit for mutating
// requests. Errors and 404s inherit the global rate limiter.
app.use('/v1', apiVersion, auditRequests);

// Health, canon, FX and reference data — no authentication required.
app.use(systemRouter);

// Core flow and governance APIs. Each router owns its own validation.
app.use('/v1/auth', authRouter);
app.use('/v1/age', ageRouter);
app.use('/v1', catalogRouter);
app.use('/v1/cart', cartRouter);
app.use('/v1', commerceSafeguardsRouter);
app.use('/v1/checkout', checkoutRouter);
app.use('/v1/orders', ordersRouter);
app.use('/v1/privacy', privacyControlsRouter);
app.use('/v1/admin', adminRouter);

// Explicitly simulated modules: deterministic/adapter-backed, never live commerce.
app.use('/v1', simulationRouter);

// The zero-build modular storefront is served by the same process.
app.use(express.static(prototypeDir, {
  index: false,
  maxAge: config.isProduction ? '1h' : 0,
  setHeaders(res, path) {
    if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  },
}));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/v1') && req.path !== '/health') {
    res.sendFile(indexPath);
    return;
  }
  next();
});

app.use(notFoundHandler);
app.use(errorHandler);
