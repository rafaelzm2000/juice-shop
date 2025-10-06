const sanitizeHtml = require('sanitize-html')
const jwt = require('jsonwebtoken')

class SecureInputHandler {
  static htmlConfig = {
    allowedTags: [ 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
      'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
      'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre'
    ],
    allowedAttributes: {
      'a': [ 'href', 'name', 'target' ],
      'img': [ 'src' ],
      '*': [ 'class', 'id' ]
    },
    // Lots of these won't come up by default because we don't allow them
    selfClosing: [ 'img', 'br', 'hr', 'area', 'base', 'basefont', 'input', 'link', 'meta' ],
    // URL schemes we permit
    allowedSchemes: [ 'http', 'https', 'ftp', 'mailto' ],
    allowedSchemesByTag: {},
    allowedSchemesAppliedToAttributes: [ 'href', 'src', 'cite' ],
    allowProtocolRelative: true
  }

  static sanitizeHtml(input) {
    if (typeof input !== 'string') return input
    return sanitizeHtml(input, this.htmlConfig)
  }

  static sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj
    
    const sanitized = {}
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value)
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => this.sanitizeObject(item))
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value)
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }

  static sanitizeString(input) {
    if (typeof input !== 'string') return input
    // Remove potentially dangerous characters
    return input.replace(/[<>]/g, '')
  }

  static validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return typeof email === 'string' && emailRegex.test(email)
  }

  static validateToken(token, secret) {
    try {
      return jwt.verify(token, secret)
    } catch (error) {
      return null
    }
  }

  // Express middleware for input sanitization
  static sanitizeMiddleware(options = {}) {
    return (req, res, next) => {
      try {
        if (req.body) {
          req.body = this.sanitizeObject(req.body)
        }
        if (req.query) {
          req.query = this.sanitizeObject(req.query)
        }
        if (req.params) {
          req.params = this.sanitizeObject(req.params)
        }
        next()
      } catch (error) {
        next(error)
      }
    }
  }
}

module.exports = SecureInputHandler
