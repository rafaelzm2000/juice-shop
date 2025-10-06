const path = require('path');
const sanitizeFilename = require('sanitize-filename');

class SecureFileHandler {
    constructor(basePath) {
        this.basePath = path.resolve(basePath);
    }

    validatePath(filePath) {
        // Sanitize the filename
        const sanitizedName = sanitizeFilename(path.basename(filePath));
        
        // Construct the full path
        const fullPath = path.join(this.basePath, sanitizedName);
        
        // Verify the resolved path is within the base directory
        const resolvedPath = path.resolve(fullPath);
        if (!resolvedPath.startsWith(this.basePath)) {
            throw new Error('Path traversal attempt detected');
        }
        
        return resolvedPath;
    }

    async sendFile(req, res, filePath) {
        try {
            const secureFilePath = this.validatePath(filePath);
            return res.sendFile(secureFilePath);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid file path' });
        }
    }

    async writeFile(filePath, data) {
        try {
            const secureFilePath = this.validatePath(filePath);
            return fs.writeFileSync(secureFilePath, data);
        } catch (error) {
            throw new Error('Invalid file path');
        }
    }
}

module.exports = SecureFileHandler;
