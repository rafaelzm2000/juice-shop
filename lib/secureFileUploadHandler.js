const path = require('path')
const fs = require('fs').promises
const unzipper = require('unzipper')
const utils = require('./utils')
const challenges = require('../data/datacache').challenges

class SecureFileUploadHandler {
  constructor(options = {}) {
    this.allowedExtensions = options.allowedExtensions || ['.zip']
    this.uploadDir = options.uploadDir || 'uploads'
    this.maxFileSize = options.maxFileSize || 5 * 1024 * 1024 // 5MB default
    this.preservePath = options.preservePath || false
  }

  validateFile(file) {
    if (!file || !file.originalname) {
      throw new Error('Invalid file')
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error('File too large')
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase()
    if (!this.allowedExtensions.includes(ext)) {
      throw new Error('Invalid file type')
    }

    return true
  }

  async validatePath(filePath) {
    const basePath = path.resolve(this.uploadDir)
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '')
    const destination = path.join(basePath, normalizedPath)

    // Ensure the destination is within the upload directory
    if (!destination.startsWith(basePath)) {
      throw new Error('Invalid file path')
    }

    // Create directory if it doesn't exist
    const dir = path.dirname(destination)
    await fs.mkdir(dir, { recursive: true })

    return destination
  }

  async handleZipUpload(file) {
    let tempFile = null

    try {
      // Validate file
      this.validateFile(file)

      // Create temp file
      tempFile = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'upload-')), 
                          path.basename(file.originalname))
      
      await fs.writeFile(tempFile, file.buffer)

      // Process zip entries
      await new Promise((resolve, reject) => {
        fs.createReadStream(tempFile)
          .pipe(unzipper.Parse())
          .on('entry', async (entry) => {
            try {
              const fileName = this.preservePath ? entry.path : path.basename(entry.path)
              const targetPath = await this.validatePath(fileName)

              // Special handling for challenge
              if (targetPath === path.resolve('ftp/legal.md')) {
                utils.solveIf(challenges.fileWriteChallenge, () => true)
              }

              await new Promise((resolve, reject) => {
                entry.pipe(fs.createWriteStream(targetPath))
                  .on('finish', resolve)
                  .on('error', reject)
              })
            } catch (error) {
              entry.autodrain()
              console.error('Error processing zip entry:', error)
            }
          })
          .on('finish', resolve)
          .on('error', reject)
      })

      return { success: true }
    } catch (error) {
      throw error
    } finally {
      // Cleanup temp file
      if (tempFile) {
        try {
          await fs.unlink(tempFile)
        } catch (error) {
          console.error('Error cleaning up temp file:', error)
        }
      }
    }
  }

  // Middleware for Express
  middleware() {
    return async (req, res, next) => {
      try {
        if (!req.file) {
          throw new Error('No file uploaded')
        }

        await this.handleZipUpload(req.file)
        res.status(204).end()
      } catch (error) {
        next(error)
      }
    }
  }
}

module.exports = SecureFileUploadHandler
