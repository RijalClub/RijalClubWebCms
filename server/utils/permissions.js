const { CONTENT_FILES, FILE_PERMISSION_LEVELS } = require('../config/content-files')

const PERMISSION_ORDER = {
  none: 0,
  read: 1,
  write: 2,
}

const SECTION_DEFAULT_LEVELS = {
  visualEditor: 'read',
  rawEditor: 'read',
  media: 'read',
  settings: 'none',
}

function normalizePermissionLevel(value, fallback = 'none') {
  if (!value) {
    return fallback
  }

  const normalized = String(value).trim().toLowerCase()
  return FILE_PERMISSION_LEVELS.includes(normalized) ? normalized : fallback
}

function normalizeFilePermissions(input, fallbackLevel = 'read') {
  const normalized = {}

  for (const file of CONTENT_FILES) {
    const level = normalizePermissionLevel(input?.[file], fallbackLevel)
    normalized[file] = level
  }

  return normalized
}

function normalizeSectionPermissions(input = {}) {
  const result = {}

  for (const [section, value] of Object.entries(input || {})) {
    if (!section || typeof section !== 'string') {
      continue
    }

    result[section.trim()] = normalizePermissionLevel(value, 'none')
  }

  return result
}

function getFilePermissionLevel(user, fileName) {
  if (!user) {
    return 'none'
  }

  if (user.role === 'master') {
    return 'write'
  }

  const value = user.filePermissions?.[fileName]
  return normalizePermissionLevel(value, 'none')
}

function hasPermissionAtLeast(user, fileName, level = 'read') {
  const required = PERMISSION_ORDER[level] ?? PERMISSION_ORDER.read
  const actual = PERMISSION_ORDER[getFilePermissionLevel(user, fileName)]
  return actual >= required
}

function getSectionPermissionLevel(user, section) {
  if (!user) {
    return 'none'
  }

  if (user.role === 'master') {
    return 'write'
  }

  const value = user.sectionPermissions?.[section]
  return normalizePermissionLevel(value, SECTION_DEFAULT_LEVELS[section] || 'none')
}

module.exports = {
  normalizePermissionLevel,
  normalizeFilePermissions,
  normalizeSectionPermissions,
  getFilePermissionLevel,
  hasPermissionAtLeast,
  getSectionPermissionLevel,
}
