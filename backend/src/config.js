import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function bool(value, fallback) {
  if (value === undefined) return fallback
  return !['false', '0', 'no', 'off'].includes(String(value).toLowerCase())
}

const nodeEnv = process.env.NODE_ENV ?? 'development'

export const config = {
  root,
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT ?? 4000),
  bindHost: process.env.BIND_HOST ?? '0.0.0.0',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 1000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 100),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://ajt:ajt@127.0.0.1:5433/ajt',
  useEmbeddedDb: bool(process.env.USE_EMBEDDED_DB, nodeEnv !== 'production'),
  pgDataDir: path.resolve(root, process.env.PG_DATA_DIR ?? '.pgdata'),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  cookieName: process.env.COOKIE_NAME ?? 'ajt_session',
  cookieSecure: bool(process.env.COOKIE_SECURE, nodeEnv === 'production'),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  seedDemo: bool(process.env.SEED_DEMO, true),
  allowDemoReset: bool(process.env.ALLOW_DEMO_RESET, true),
  roadRoutingEnabled: bool(process.env.ROAD_ROUTING_ENABLED, true),
  osrmBaseUrl: (process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org').replace(
    /\/+$/,
    '',
  ),
  routingTimeoutMs: Number(process.env.ROUTING_TIMEOUT_MS ?? 6000),
  geocodeTimeoutMs: Number(process.env.GEOCODE_TIMEOUT_MS ?? 8000),
  mapboxAccessToken: String(process.env.MAPBOX_ACCESS_TOKEN ?? '').trim(),
  googleMapsApiKey: String(process.env.GOOGLE_MAPS_API_KEY ?? '').trim(),
}

if (config.isProduction && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET wajib diisi dengan nilai acak pada mode produksi.')
}
