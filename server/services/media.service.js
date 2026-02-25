const path = require('node:path')
const crypto = require('node:crypto')

const { env } = require('../config/env')
const {
  DEFAULT_MEDIA_FOLDER,
} = require('../config/media-folders')
const { HttpError } = require('../utils/http-error')
const {
  normalizeJoinedPath,
  writeRepoFile,
  buildPublicMediaUrl,
  listRepoTree,
} = require('./github.service')

function sanitizePathSegment(value) {
  return String(value || '')
    .trim()
    .replace(/\.\.+/g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '-')
    .replace(/^\/+|\/+$/g, '')
}

function sanitizeFileName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
}

function ensureValidUpload(file) {
  if (!file) {
    throw new HttpError(400, 'No file uploaded.')
  }

  if (!file.buffer || file.buffer.length < 1) {
    throw new HttpError(400, 'Uploaded file is empty.')
  }

  if (file.buffer.length > env.uploadMaxBytes) {
    throw new HttpError(413, `File exceeds upload limit of ${env.uploadMaxBytes} bytes.`)
  }
}

function resolveUploadFolder(value) {
  const folder = sanitizePathSegment(value || DEFAULT_MEDIA_FOLDER)

  if (!folder) {
    throw new HttpError(400, 'Folder is required.')
  }

  // Keep uploads inside the shared media namespace.
  if (!/^images(?:\/[a-zA-Z0-9_-]+)+$/.test(folder)) {
    throw new HttpError(400, 'Invalid folder. Use a path like images/blog or images/store/new-items.')
  }

  return folder
}

function inferMediaType(filePath) {
  const extension = path.extname(filePath).toLowerCase()

  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'].includes(extension)) {
    return 'image'
  }

  if (['.mp4', '.webm', '.mov', '.m4v'].includes(extension)) {
    return 'video'
  }

  if (extension === '.pdf') {
    return 'pdf'
  }

  return 'file'
}

async function listMediaFiles() {
  const tree = await listRepoTree(env.mediaRepo, 'MEDIA')
  const basePath = normalizeJoinedPath(env.mediaRepo.basePath, '')
  const basePrefix = basePath ? `${basePath}/` : ''

  const files = tree
    .filter((entry) => entry.type === 'blob')
    .filter((entry) => !entry.path.endsWith('/.gitkeep') && !entry.path.endsWith('.gitkeep'))
    .filter((entry) => (basePrefix ? entry.path.startsWith(basePrefix) : true))
    .map((entry) => {
      const relativePath = basePrefix ? entry.path.slice(basePrefix.length) : entry.path
      const folder = relativePath.includes('/') ? relativePath.slice(0, relativePath.lastIndexOf('/')) : ''
      const fullPath = normalizeJoinedPath(basePath, relativePath)
      const mediaType = inferMediaType(relativePath)

      return {
        path: relativePath,
        folder,
        fileName: path.basename(relativePath),
        mediaType,
        size: entry.size || 0,
        url: buildPublicMediaUrl(env.mediaRepo, fullPath),
      }
    })
    .sort((a, b) => a.path.localeCompare(b.path))

  const folderSet = new Set()
  for (const file of files) {
    if (file.folder) {
      folderSet.add(file.folder)
    }
  }

  return {
    folders: [...folderSet].sort((a, b) => a.localeCompare(b)),
    files,
  }
}

async function uploadMedia(file, options, actor) {
  ensureValidUpload(file)

  const folder = resolveUploadFolder(options?.folder)
  const extension = path.extname(file.originalname || '').toLowerCase()
  const base = path.basename(file.originalname || 'image', extension)
  const safeBase = sanitizeFileName(base) || 'media'
  const providedName = sanitizeFileName(options?.fileName || '')
  const uniqueId = crypto.randomUUID().slice(0, 8)
  const fileName = providedName || `${Date.now()}-${uniqueId}-${safeBase}${extension}`

  const relativePath = normalizeJoinedPath(folder, fileName)
  const fullPath = normalizeJoinedPath(env.mediaRepo.basePath, relativePath)
  const contentBase64 = file.buffer.toString('base64')

  await writeRepoFile(
    env.mediaRepo,
    relativePath,
    contentBase64,
    {
      message: `chore(media): ${actor?.username || 'admin'} uploaded ${relativePath}`,
      contentIsBase64: true,
    },
    'MEDIA',
  )

  return {
    path: fullPath,
    fileName,
    folder,
    url: buildPublicMediaUrl(env.mediaRepo, fullPath),
  }
}

module.exports = {
  listMediaFiles,
  uploadMedia,
}
