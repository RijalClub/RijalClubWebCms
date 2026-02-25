const { verifyAccessToken } = require('../services/auth.service')
const usersService = require('../services/users.service')
const { HttpError } = require('../utils/http-error')
const { hasPermissionAtLeast, getSectionPermissionLevel } = require('../utils/permissions')

function getAuthTokenFromRequest(req, cookieName) {
  const cookieToken = req.cookies?.[cookieName]
  if (cookieToken) {
    return cookieToken
  }

  const authHeader = req.headers.authorization || ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length)
  }

  return null
}

async function requireAuth(req, _res, next) {
  try {
    const token = getAuthTokenFromRequest(req, req.app.locals.env.authCookieName)

    if (!token) {
      throw new HttpError(401, 'Authentication required.')
    }

    const claims = verifyAccessToken(token)
    const user = await usersService.getUserById(claims.sub)

    if (!user || !user.active) {
      throw new HttpError(401, 'Account is inactive or no longer exists.')
    }

    req.authUser = user
    next()
  } catch (error) {
    if (error instanceof HttpError) {
      return next(error)
    }

    return next(new HttpError(401, 'Invalid or expired auth token.'))
  }
}

function requireMaster(req, _res, next) {
  if (req.authUser?.role !== 'master') {
    return next(new HttpError(403, 'Master role required.'))
  }

  return next()
}

function requireFilePermission(level = 'read') {
  return (req, _res, next) => {
    const fileName = req.params.file

    if (!hasPermissionAtLeast(req.authUser, fileName, level)) {
      return next(new HttpError(403, `You do not have ${level} access to ${fileName}.`))
    }

    return next()
  }
}

function requireSectionPermission(section, level = 'read') {
  return (req, _res, next) => {
    const actual = getSectionPermissionLevel(req.authUser, section)
    const order = { none: 0, read: 1, write: 2 }

    if ((order[actual] || 0) < (order[level] || 1)) {
      return next(new HttpError(403, `You do not have ${level} access to section "${section}".`))
    }

    return next()
  }
}

module.exports = {
  requireAuth,
  requireMaster,
  requireFilePermission,
  requireSectionPermission,
}
