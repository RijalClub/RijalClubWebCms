const express = require('express')
const { z } = require('zod')

const { env } = require('../config/env')
const { requireAuth } = require('../middleware/auth.middleware')
const { createAccessToken } = require('../services/auth.service')
const usersService = require('../services/users.service')

const router = express.Router()

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user
  return safeUser
}

router.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body)
    const user = await usersService.authenticate(input.username, input.password)

    if (!user) {
      return res.status(401).json({
        error: 'Invalid username or password.',
      })
    }

    const token = createAccessToken(user)

    res.cookie(env.authCookieName, token, {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    })

    return res.json({
      user: sanitizeUser(user),
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/logout', (_req, res) => {
  res.clearCookie(env.authCookieName, {
    path: '/',
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    httpOnly: true,
  })

  return res.status(204).send()
})

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: sanitizeUser(req.authUser),
  })
})

module.exports = router
