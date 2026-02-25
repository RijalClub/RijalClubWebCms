const { HttpError } = require('../utils/http-error')
const { env } = require('../config/env')

const GITHUB_API_BASE = 'https://api.github.com'

function encodePath(pathValue) {
  return pathValue
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function normalizeJoinedPath(basePath, filePath) {
  return [basePath, filePath]
    .filter(Boolean)
    .map((value) => String(value).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')
}

function assertRepoConfig(repoConfig, label) {
  const missing = []

  if (!repoConfig.owner) missing.push(`${label}_GITHUB_OWNER`)
  if (!repoConfig.repo) missing.push(`${label}_GITHUB_REPO`)
  if (!repoConfig.token) missing.push(`${label}_GITHUB_TOKEN`)

  if (missing.length > 0) {
    throw new HttpError(
      500,
      `${label} repository is not configured. Missing: ${missing.join(', ')}`,
    )
  }
}

async function githubRequest(repoConfig, pathValue, options = {}) {
  const { method = 'GET', body } = options

  const endpoint = `${GITHUB_API_BASE}${pathValue}`
  const response = await fetch(endpoint, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${repoConfig.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'RijalClub-CMS',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const rawText = await response.text()
  let parsed

  if (rawText) {
    try {
      parsed = JSON.parse(rawText)
    } catch {
      parsed = { message: rawText }
    }
  }

  if (!response.ok) {
    const message = parsed?.message || `GitHub API error (${response.status})`

    throw new HttpError(response.status, message, {
      status: response.status,
      endpoint,
      body: parsed,
    })
  }

  return parsed
}

function decodeBase64Content(content) {
  return Buffer.from((content || '').replace(/\n/g, ''), 'base64').toString('utf8')
}

function encodeBase64Content(content) {
  return Buffer.from(content, 'utf8').toString('base64')
}

function resolveCommitIdentity(options = {}) {
  const hasCustomCommitter = Boolean(options.committer?.name && options.committer?.email)
  const hasCustomAuthor = Boolean(options.author?.name && options.author?.email)
  const defaultIdentity = env.commitIdentity
  const hasDefaultIdentity = Boolean(defaultIdentity?.name && defaultIdentity?.email)

  return {
    committer: hasCustomCommitter ? options.committer : hasDefaultIdentity ? defaultIdentity : undefined,
    author: hasCustomAuthor ? options.author : hasDefaultIdentity ? defaultIdentity : undefined,
  }
}

async function readRepoFile(repoConfig, filePath, label = 'CONTENT') {
  assertRepoConfig(repoConfig, label)

  const normalizedPath = normalizeJoinedPath(repoConfig.basePath, filePath)
  const encodedPath = encodePath(normalizedPath)

  const data = await githubRequest(
    repoConfig,
    `/repos/${encodeURIComponent(repoConfig.owner)}/${encodeURIComponent(repoConfig.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(repoConfig.branch)}`,
  )

  return {
    path: normalizedPath,
    sha: data.sha,
    content: decodeBase64Content(data.content),
    htmlUrl: data.html_url,
    downloadUrl: data.download_url,
  }
}

async function writeRepoFile(repoConfig, filePath, content, options = {}, label = 'CONTENT') {
  assertRepoConfig(repoConfig, label)

  const normalizedPath = normalizeJoinedPath(repoConfig.basePath, filePath)
  const encodedPath = encodePath(normalizedPath)
  const identity = resolveCommitIdentity(options)

  const payload = {
    message: options.message || `chore: update ${normalizedPath}`,
    content: options.contentIsBase64 ? content : encodeBase64Content(content),
    branch: repoConfig.branch,
    ...(identity.committer ? { committer: identity.committer } : {}),
    ...(identity.author ? { author: identity.author } : {}),
  }

  if (options.sha) {
    payload.sha = options.sha
  }

  const data = await githubRequest(
    repoConfig,
    `/repos/${encodeURIComponent(repoConfig.owner)}/${encodeURIComponent(repoConfig.repo)}/contents/${encodedPath}`,
    {
      method: 'PUT',
      body: payload,
    },
  )

  return {
    path: normalizedPath,
    contentSha: data?.content?.sha,
    commitSha: data?.commit?.sha,
    commitUrl: data?.commit?.html_url,
  }
}

async function listRepoTree(repoConfig, label = 'CONTENT') {
  assertRepoConfig(repoConfig, label)

  const data = await githubRequest(
    repoConfig,
    `/repos/${encodeURIComponent(repoConfig.owner)}/${encodeURIComponent(repoConfig.repo)}/git/trees/${encodeURIComponent(repoConfig.branch)}?recursive=1`,
  )

  return Array.isArray(data?.tree) ? data.tree : []
}

function buildPublicMediaUrl(repoConfig, fullPath) {
  if (repoConfig.publicBaseUrl) {
    return `${repoConfig.publicBaseUrl.replace(/\/+$/, '')}/${fullPath.replace(/^\/+/, '')}`
  }

  return `https://raw.githubusercontent.com/${repoConfig.owner}/${repoConfig.repo}/${repoConfig.branch}/${fullPath}`
}

module.exports = {
  normalizeJoinedPath,
  readRepoFile,
  writeRepoFile,
  listRepoTree,
  buildPublicMediaUrl,
}
