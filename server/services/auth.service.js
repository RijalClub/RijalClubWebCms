const jwt = require('jsonwebtoken')
const { env } = require('../config/env')

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    },
  )
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret)
}

module.exports = {
  createAccessToken,
  verifyAccessToken,
}
