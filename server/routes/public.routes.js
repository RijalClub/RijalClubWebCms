const express = require('express')

const { env } = require('../config/env')
const contentService = require('../services/content.service')
const { HttpError } = require('../utils/http-error')

const router = express.Router()

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'rijalclub-content-api',
    timestamp: new Date().toISOString(),
  })
})

router.get('/content/:file', async (req, res, next) => {
  try {
    if (env.contentPublicKey) {
      const providedKey =
        String(req.headers['x-content-public-key'] || req.query.key || '')

      if (!providedKey || providedKey !== env.contentPublicKey) {
        throw new HttpError(401, 'Missing or invalid content public key.')
      }
    }

    const data = await contentService.getPublicContent(req.params.file)

    res.setHeader('Cache-Control', `public, max-age=${env.contentPublicCacheSeconds}`)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

module.exports = router
