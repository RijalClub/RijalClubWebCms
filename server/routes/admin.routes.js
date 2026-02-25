const express = require('express')
const multer = require('multer')
const { z } = require('zod')

const { CONTENT_FILES } = require('../config/content-files')
const { env } = require('../config/env')
const { MEDIA_FOLDER_OPTIONS } = require('../config/media-folders')
const {
  requireAuth,
  requireMaster,
  requireFilePermission,
  requireSectionPermission,
} = require('../middleware/auth.middleware')
const contentService = require('../services/content.service')
const mediaService = require('../services/media.service')
const usersService = require('../services/users.service')
const { getFilePermissionLevel } = require('../utils/permissions')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.uploadMaxBytes,
  },
})

const upsertContentSchema = z
  .object({
    raw: z.string().optional(),
    json: z.any().optional(),
  })
  .refine((payload) => payload.raw !== undefined || payload.json !== undefined, {
    message: 'Provide either raw JSON string or json object payload.',
  })

const createUserSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['master', 'editor']).optional(),
  active: z.boolean().optional(),
  filePermissions: z.record(z.string(), z.enum(['none', 'read', 'write'])).optional(),
  sectionPermissions: z.record(z.string(), z.enum(['none', 'read', 'write'])).optional(),
})

const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  role: z.enum(['master', 'editor']).optional(),
  active: z.boolean().optional(),
  filePermissions: z.record(z.string(), z.enum(['none', 'read', 'write'])).optional(),
  sectionPermissions: z.record(z.string(), z.enum(['none', 'read', 'write'])).optional(),
})

const resetPasswordSchema = z.object({
  password: z.string().min(8),
})

function toFolderId(folderPath) {
  return String(folderPath || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

router.use(requireAuth)

router.get('/files', (req, res) => {
  const files = CONTENT_FILES.map((file) => ({
    file,
    permission: getFilePermissionLevel(req.authUser, file),
  }))

  res.json({ files })
})

router.get(
  '/content/:file',
  requireSectionPermission('rawEditor', 'read'),
  requireFilePermission('read'),
  async (req, res, next) => {
    try {
      const data = await contentService.getAdminContent(req.params.file)
      res.json(data)
    } catch (error) {
      next(error)
    }
  },
)

router.put(
  '/content/:file',
  requireSectionPermission('rawEditor', 'write'),
  requireFilePermission('write'),
  async (req, res, next) => {
    try {
      const input = upsertContentSchema.parse(req.body)
      const payload = input.raw !== undefined ? input.raw : input.json

      const data = await contentService.saveAdminContent(req.params.file, payload, req.authUser)
      res.json(data)
    } catch (error) {
      next(error)
    }
  },
)

router.get(
  '/visual/:file',
  requireSectionPermission('visualEditor', 'read'),
  requireFilePermission('read'),
  async (req, res, next) => {
    try {
      const data = await contentService.getAdminContent(req.params.file)
      res.json(data)
    } catch (error) {
      next(error)
    }
  },
)

router.put(
  '/visual/:file',
  requireSectionPermission('visualEditor', 'write'),
  requireFilePermission('write'),
  async (req, res, next) => {
    try {
      const input = upsertContentSchema.parse(req.body)
      const payload = input.raw !== undefined ? input.raw : input.json

      const data = await contentService.saveAdminContent(req.params.file, payload, req.authUser)
      res.json(data)
    } catch (error) {
      next(error)
    }
  },
)

router.get('/media/folders', requireSectionPermission('media', 'read'), async (_req, res, next) => {
  try {
    const mediaList = await mediaService.listMediaFiles()
    const dynamicFolders = mediaList?.folders || []
    const folderMap = new Map()

    for (const option of MEDIA_FOLDER_OPTIONS) {
      folderMap.set(option.path, option)
    }

    for (const folderPath of dynamicFolders) {
      if (folderMap.has(folderPath)) {
        continue
      }

      folderMap.set(folderPath, {
        id: toFolderId(folderPath),
        label: folderPath,
        path: folderPath,
      })
    }

    const folders = [...folderMap.values()].sort((a, b) => a.path.localeCompare(b.path))
    res.json({ folders })
  } catch (error) {
    if (MEDIA_FOLDER_OPTIONS.length > 0) {
      res.json({ folders: MEDIA_FOLDER_OPTIONS, fallback: true })
      return
    }

    next(error)
  }
})

router.get('/media/files', requireSectionPermission('media', 'read'), async (_req, res, next) => {
  try {
    const data = await mediaService.listMediaFiles()
    res.json(data)
  } catch (error) {
    next(error)
  }
})

router.get('/users', requireMaster, async (_req, res, next) => {
  try {
    const users = await usersService.listUsers()
    res.json({ users })
  } catch (error) {
    next(error)
  }
})

router.post('/users', requireMaster, async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body)
    const user = await usersService.createUser(input, req.authUser)
    res.status(201).json({ user })
  } catch (error) {
    next(error)
  }
})

router.patch('/users/:id', requireMaster, async (req, res, next) => {
  try {
    const input = updateUserSchema.parse(req.body)
    const user = await usersService.updateUser(req.params.id, input, req.authUser)
    res.json({ user })
  } catch (error) {
    next(error)
  }
})

router.patch('/users/:id/password', requireMaster, async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body)
    const user = await usersService.updateUserPassword(req.params.id, input.password, req.authUser)
    res.json({ user })
  } catch (error) {
    next(error)
  }
})

router.post('/media/upload', requireSectionPermission('media', 'write'), upload.single('file'), async (req, res, next) => {
  try {
    const result = await mediaService.uploadMedia(req.file, req.body, req.authUser)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
})

module.exports = router
