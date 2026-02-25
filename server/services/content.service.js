const { CONTENT_FILE_SET } = require('../config/content-files')
const { env } = require('../config/env')
const { HttpError } = require('../utils/http-error')
const { readRepoFile, writeRepoFile } = require('./github.service')

const publicCache = new Map()

function assertContentFile(fileName) {
  const normalized = String(fileName || '').trim().replace(/^\/+/, '')

  if (!CONTENT_FILE_SET.has(normalized)) {
    throw new HttpError(404, `Unknown content file: ${fileName}`)
  }

  return normalized
}

function parseJsonOrThrow(fileName, value) {
  try {
    return JSON.parse(value)
  } catch (error) {
    throw new HttpError(400, `${fileName} contains invalid JSON.`, {
      reason: error instanceof Error ? error.message : 'JSON parse failed',
    })
  }
}

function toCanonicalJson(input) {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input
  return `${JSON.stringify(parsed, null, 2)}\n`
}

function invalidatePublicCache(fileName) {
  publicCache.delete(fileName)
}

async function getPublicContent(fileName) {
  const normalizedFile = assertContentFile(fileName)
  const cached = publicCache.get(normalizedFile)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const file = await readRepoFile(env.contentRepo, normalizedFile, 'CONTENT')
  const parsed = parseJsonOrThrow(normalizedFile, file.content)

  publicCache.set(normalizedFile, {
    expiresAt: Date.now() + env.contentPublicCacheSeconds * 1000,
    value: parsed,
  })

  return parsed
}

async function getAdminContent(fileName) {
  const normalizedFile = assertContentFile(fileName)
  const file = await readRepoFile(env.contentRepo, normalizedFile, 'CONTENT')
  const parsed = parseJsonOrThrow(normalizedFile, file.content)

  return {
    file: normalizedFile,
    sha: file.sha,
    content: parsed,
    raw: file.content,
  }
}

async function saveAdminContent(fileName, payload, actor) {
  const normalizedFile = assertContentFile(fileName)

  let canonicalJson

  try {
    canonicalJson = toCanonicalJson(payload)
  } catch (error) {
    throw new HttpError(400, `Invalid JSON payload for ${normalizedFile}.`, {
      reason: error instanceof Error ? error.message : 'Unknown JSON error',
    })
  }

  const existing = await readRepoFile(env.contentRepo, normalizedFile, 'CONTENT')

  const commitMessage =
    `chore(content): ${actor?.username || 'admin'} updated ${normalizedFile}`

  const writeResult = await writeRepoFile(
    env.contentRepo,
    normalizedFile,
    canonicalJson,
    {
      sha: existing.sha,
      message: commitMessage,
    },
    'CONTENT',
  )

  invalidatePublicCache(normalizedFile)

  return {
    file: normalizedFile,
    commitSha: writeResult.commitSha,
    commitUrl: writeResult.commitUrl,
    content: JSON.parse(canonicalJson),
  }
}

module.exports = {
  assertContentFile,
  getPublicContent,
  getAdminContent,
  saveAdminContent,
  invalidatePublicCache,
}
