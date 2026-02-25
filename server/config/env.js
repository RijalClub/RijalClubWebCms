const path = require('node:path')
const dotenv = require('dotenv')

dotenv.config({ quiet: true })

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function toBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback
  }

  const normalized = String(value).trim().toLowerCase()
  return ['true', '1', 'yes', 'on'].includes(normalized)
}

function splitCsv(value, fallback = []) {
  if (!value || !value.trim()) {
    return fallback
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toPositiveInt(process.env.PORT, 4000),
  apiBasePath: process.env.API_BASE_PATH || '/api',
  adminOrigins: splitCsv(process.env.ADMIN_ORIGIN, ['http://localhost:5173']),
  jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  authCookieName: process.env.AUTH_COOKIE_NAME || 'rijal_admin_token',
  contentPublicKey: process.env.CONTENT_PUBLIC_KEY || '',
  contentPublicCacheSeconds: toPositiveInt(process.env.CONTENT_PUBLIC_CACHE_SECONDS, 60),
  commitIdentity: {
    name: process.env.GITHUB_COMMITTER_NAME || 'RijalEditBot',
    email: process.env.GITHUB_COMMITTER_EMAIL || 'rijaleditbot@users.noreply.github.com',
  },

  contentRepo: {
    owner: process.env.CONTENT_GITHUB_OWNER || '',
    repo: process.env.CONTENT_GITHUB_REPO || '',
    branch: process.env.CONTENT_GITHUB_BRANCH || 'main',
    token: process.env.CONTENT_GITHUB_TOKEN || '',
    basePath: (process.env.CONTENT_GITHUB_BASE_PATH || 'content').replace(/^\/+|\/+$/g, ''),
  },

  mediaRepo: {
    owner: process.env.MEDIA_GITHUB_OWNER || '',
    repo: process.env.MEDIA_GITHUB_REPO || '',
    branch: process.env.MEDIA_GITHUB_BRANCH || 'main',
    token: process.env.MEDIA_GITHUB_TOKEN || '',
    basePath: (process.env.MEDIA_GITHUB_BASE_PATH || 'assets').replace(/^\/+|\/+$/g, ''),
    publicBaseUrl:
      process.env.MEDIA_PUBLIC_BASE_URL ||
      (process.env.MEDIA_GITHUB_OWNER && process.env.MEDIA_GITHUB_REPO
        ? `https://raw.githubusercontent.com/${process.env.MEDIA_GITHUB_OWNER}/${process.env.MEDIA_GITHUB_REPO}/${process.env.MEDIA_GITHUB_BRANCH || 'main'}`
        : ''),
  },

  authStorePath: process.env.AUTH_STORE_PATH || '.admin/users.json',
  bootstrapMasterUsername: process.env.BOOTSTRAP_MASTER_USERNAME || 'master',
  bootstrapMasterPassword: process.env.BOOTSTRAP_MASTER_PASSWORD || '',
  bootstrapMasterDisplayName: process.env.BOOTSTRAP_MASTER_DISPLAY_NAME || 'Master Admin',

  uploadMaxBytes: toPositiveInt(process.env.UPLOAD_MAX_BYTES, 8 * 1024 * 1024),
  trustProxy: toBoolean(process.env.TRUST_PROXY, false),
  staticDistPath: path.resolve(process.cwd(), 'dist'),
}

module.exports = {
  env,
}
