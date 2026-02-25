const crypto = require('node:crypto')
const bcrypt = require('bcryptjs')
const { z } = require('zod')

const { env } = require('../config/env')
const { CONTENT_FILES } = require('../config/content-files')
const { normalizeFilePermissions, normalizeSectionPermissions } = require('../utils/permissions')
const { HttpError } = require('../utils/http-error')
const { readRepoFile, writeRepoFile } = require('./github.service')

const USER_STORE_VERSION = 1
const CACHE_TTL_MS = 15_000
const MIN_PASSWORD_LENGTH = 8

const permissionSchema = z.enum(['none', 'read', 'write'])

const userSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  role: z.enum(['master', 'editor']),
  active: z.boolean(),
  filePermissions: z.record(z.string(), permissionSchema),
  sectionPermissions: z.record(z.string(), permissionSchema).optional().default({}),
  passwordHash: z.string().min(1),
  lastLoginAt: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

const storeSchema = z.object({
  version: z.number().int().min(1),
  users: z.array(userSchema),
})

let cache = {
  expiresAt: 0,
  sha: null,
  store: null,
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase()
}

function isProtectedMasterAccount(user) {
  if (!user) {
    return false
  }

  return (
    user.role === 'master' &&
    normalizeUsername(user.username) === normalizeUsername(env.bootstrapMasterUsername)
  )
}

function createMasterFilePermissions() {
  const permissions = {}
  for (const file of CONTENT_FILES) {
    permissions[file] = 'write'
  }
  return permissions
}

function createMasterSectionPermissions() {
  return {
    visualEditor: 'write',
    rawEditor: 'write',
    media: 'write',
    settings: 'write',
  }
}

function createDefaultEditorSectionPermissions() {
  return {
    visualEditor: 'read',
    rawEditor: 'read',
    media: 'read',
    settings: 'none',
  }
}

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user
  return {
    ...safeUser,
    protected: isProtectedMasterAccount(user),
  }
}

function ensurePasswordStrength(password) {
  if (!password || String(password).trim().length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
}

async function bootstrapStore() {
  if (!env.bootstrapMasterPassword) {
    throw new HttpError(
      500,
      'Auth store is missing and BOOTSTRAP_MASTER_PASSWORD is not set.',
    )
  }

  const timestamp = nowIso()
  const masterUser = {
    id: crypto.randomUUID(),
    username: normalizeUsername(env.bootstrapMasterUsername),
    displayName: env.bootstrapMasterDisplayName,
    role: 'master',
    active: true,
    filePermissions: createMasterFilePermissions(),
    sectionPermissions: createMasterSectionPermissions(),
    passwordHash: await bcrypt.hash(env.bootstrapMasterPassword, 12),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const store = {
    version: USER_STORE_VERSION,
    users: [masterUser],
  }

  const serialized = `${JSON.stringify(store, null, 2)}\n`
  const writeResult = await writeRepoFile(
    env.contentRepo,
    env.authStorePath,
    serialized,
    {
      message: 'chore(auth): bootstrap master account',
    },
    'CONTENT',
  )

  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    sha: writeResult.contentSha,
    store,
  }

  return {
    sha: writeResult.contentSha,
    store,
  }
}

async function readStore(force = false) {
  if (!force && cache.store && cache.expiresAt > Date.now()) {
    return {
      sha: cache.sha,
      store: cache.store,
    }
  }

  try {
    const file = await readRepoFile(env.contentRepo, env.authStorePath, 'CONTENT')
    const parsed = storeSchema.parse(JSON.parse(file.content))

    cache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      sha: file.sha,
      store: parsed,
    }

    return {
      sha: file.sha,
      store: parsed,
    }
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 404) {
      return bootstrapStore()
    }

    if (error instanceof z.ZodError) {
      throw new HttpError(500, 'Auth store schema is invalid.', error.issues)
    }

    throw error
  }
}

async function writeStore(store, sha, message) {
  const parsed = storeSchema.parse(store)
  const serialized = `${JSON.stringify(parsed, null, 2)}\n`

  const writeResult = await writeRepoFile(
    env.contentRepo,
    env.authStorePath,
    serialized,
    {
      sha,
      message,
    },
    'CONTENT',
  )

  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    sha: writeResult.contentSha,
    store: parsed,
  }

  return parsed
}

function assertAtLeastOneMaster(users, userIdBeingModified, incomingRole, incomingActive) {
  const updatedUsers = users.map((user) => {
    if (user.id !== userIdBeingModified) {
      return user
    }

    return {
      ...user,
      role: incomingRole ?? user.role,
      active: incomingActive ?? user.active,
    }
  })

  const activeMasterCount = updatedUsers.filter((user) => user.role === 'master' && user.active).length

  if (activeMasterCount < 1) {
    throw new HttpError(400, 'At least one active master account must remain.')
  }
}

async function listUsers() {
  const { store } = await readStore()
  return store.users.map(sanitizeUser)
}

async function getUserById(id) {
  const userId = String(id || '').trim()
  if (!userId) {
    return null
  }

  const { store } = await readStore()
  const user = store.users.find((entry) => entry.id === userId)
  return user || null
}

async function authenticate(username, password) {
  const targetUsername = normalizeUsername(username)

  const { store, sha } = await readStore()
  const user = store.users.find((entry) => entry.username === targetUsername)

  if (!user || !user.active) {
    return null
  }

  const valid = await bcrypt.compare(String(password || ''), user.passwordHash)
  if (!valid) {
    return null
  }

  user.lastLoginAt = nowIso()
  user.updatedAt = nowIso()

  await writeStore(store, sha, `chore(auth): update last login for ${user.username}`)

  return user
}

async function createUser(payload, actor) {
  const username = normalizeUsername(payload.username)
  const displayName = String(payload.displayName || username).trim() || username
  const role = payload.role === 'master' ? 'master' : 'editor'

  if (!username) {
    throw new HttpError(400, 'Username is required.')
  }

  ensurePasswordStrength(payload.password)

  const { store, sha } = await readStore(true)

  if (store.users.some((entry) => entry.username === username)) {
    throw new HttpError(409, 'Username is already in use.')
  }

  const timestamp = nowIso()
  const user = {
    id: crypto.randomUUID(),
    username,
    displayName,
    role,
    active: payload.active !== false,
    filePermissions:
      role === 'master'
        ? createMasterFilePermissions()
        : normalizeFilePermissions(payload.filePermissions, 'read'),
    sectionPermissions:
      role === 'master'
        ? createMasterSectionPermissions()
        : normalizeSectionPermissions(payload.sectionPermissions || createDefaultEditorSectionPermissions()),
    passwordHash: await bcrypt.hash(payload.password, 12),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  store.users.push(user)

  await writeStore(
    store,
    sha,
    `chore(auth): ${actor?.username || 'master'} created ${role} ${username}`,
  )

  return sanitizeUser(user)
}

async function updateUser(userId, payload, actor) {
  const id = String(userId || '').trim()

  const { store, sha } = await readStore(true)
  const target = store.users.find((entry) => entry.id === id)

  if (!target) {
    throw new HttpError(404, 'User not found.')
  }

  if (isProtectedMasterAccount(target)) {
    throw new HttpError(403, 'Protected master account cannot be edited.')
  }

  const nextRole = payload.role ? (payload.role === 'master' ? 'master' : 'editor') : target.role
  const nextActive = payload.active === undefined ? target.active : Boolean(payload.active)

  assertAtLeastOneMaster(store.users, id, nextRole, nextActive)

  if (payload.displayName !== undefined) {
    const displayName = String(payload.displayName).trim()
    if (!displayName) {
      throw new HttpError(400, 'Display name cannot be empty.')
    }
    target.displayName = displayName
  }

  target.role = nextRole
  target.active = nextActive

  if (nextRole === 'master') {
    target.filePermissions = createMasterFilePermissions()
    target.sectionPermissions = createMasterSectionPermissions()
  } else {
    if (payload.filePermissions) {
      target.filePermissions = normalizeFilePermissions(payload.filePermissions, 'read')
    }

    if (payload.sectionPermissions) {
      target.sectionPermissions = normalizeSectionPermissions(payload.sectionPermissions)
    }
  }

  target.updatedAt = nowIso()

  await writeStore(
    store,
    sha,
    `chore(auth): ${actor?.username || 'master'} updated ${target.username}`,
  )

  return sanitizeUser(target)
}

async function updateUserPassword(userId, newPassword, actor) {
  const id = String(userId || '').trim()

  ensurePasswordStrength(newPassword)

  const { store, sha } = await readStore(true)
  const target = store.users.find((entry) => entry.id === id)

  if (!target) {
    throw new HttpError(404, 'User not found.')
  }

  if (isProtectedMasterAccount(target)) {
    throw new HttpError(403, 'Protected master account cannot be edited.')
  }

  target.passwordHash = await bcrypt.hash(newPassword, 12)
  target.updatedAt = nowIso()

  await writeStore(
    store,
    sha,
    `chore(auth): ${actor?.username || 'master'} reset password for ${target.username}`,
  )

  return sanitizeUser(target)
}

module.exports = {
  listUsers,
  getUserById,
  authenticate,
  createUser,
  updateUser,
  updateUserPassword,
}
