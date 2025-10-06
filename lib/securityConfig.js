const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const SecureInputHandler = require('./secureInputHandler')
const csrf = require('csurf')
const cookieParser = require('cookie-parser')

const securityConfig = {
  // CSRF protection
  csrf: csrf({ 
    cookie: true,
    ignoreMethods: ['HEAD', 'OPTIONS'],
    value: req => req.headers['x-csrf-token']
  }),

  // Rate limiting
  rateLimit: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }),

  // Helmet security headers
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    referrerPolicy: { policy: 'same-origin' }
  }),

  // Cookie security
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}

// Apply security middleware
function applySecurityMiddleware(app) {
  // Parse cookies
  app.use(cookieParser())

  // Apply Helmet security headers
  app.use(securityConfig.helmet)

  // Apply rate limiting
  app.use(securityConfig.rateLimit)

  // Apply CSRF protection
  app.use(securityConfig.csrf)

  // Apply input sanitization
  app.use(SecureInputHandler.sanitizeMiddleware())

  // Error handler for CSRF
  app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
      res.status(403).json({
        error: 'Invalid CSRF token'
      })
    } else {
      next(err)
    }
  })
}

module.exports = {
  config: securityConfig,
  applySecurityMiddleware
}
