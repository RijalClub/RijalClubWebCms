const fs = require('node:fs')
const path = require('node:path')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const { env } = require('./config/env')
const publicRoutes = require('./routes/public.routes')
const authRoutes = require('./routes/auth.routes')
const adminRoutes = require('./routes/admin.routes')
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware')

function createCorsOptions() {
  const hasWildcard = env.adminOrigins.includes('*')
  const allowedOrigins = new Set(
    env.adminOrigins
      .map((entry) => String(entry || '').trim().replace(/\/+$/, ''))
      .filter(Boolean),
  )

  return {
    origin(origin, callback) {
      if (!origin || hasWildcard) {
        return callback(null, true)
      }

      const normalizedOrigin = String(origin).trim().replace(/\/+$/, '')

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true)
      }

      return callback(new Error(`CORS blocked origin: ${origin}`))
    },
    credentials: true,
  }
}

function createApp() {
  const app = express()

  if (env.trustProxy) {
    app.set('trust proxy', 1)
  }

  app.locals.env = env

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        directives: {
          imgSrc: ["'self'", 'data:', 'https://raw.githubusercontent.com'],
          mediaSrc: ["'self'", 'data:', 'blob:', 'https://raw.githubusercontent.com'],
        },
      },
    }),
  )
  app.use(cors(createCorsOptions()))
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())

  app.use(
    `${env.apiBasePath}/auth/login`,
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  app.use(env.apiBasePath, publicRoutes)
  app.use(`${env.apiBasePath}/auth`, authRoutes)
  app.use(`${env.apiBasePath}/admin`, adminRoutes)

  const staticIndex = path.join(env.staticDistPath, 'index.html')

  if (fs.existsSync(staticIndex)) {
    app.use(express.static(env.staticDistPath))

    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith(env.apiBasePath)) {
        return next()
      }

      return res.sendFile(staticIndex)
    })
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

module.exports = {
  createApp,
}
