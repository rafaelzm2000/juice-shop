const sanitizeHtml = require('sanitize-html');
const { DOMPurify } = require('dompurify');

class InputValidator {
    static sanitizeConfig = {
        allowedTags: [ 'b', 'i', 'em', 'strong', 'a' ],
        allowedAttributes: {
            'a': [ 'href' ]
        },
        allowedIframeHostnames: []
    };

    static sanitizeHTML(input) {
        if (typeof input !== 'string') return input;
        return sanitizeHtml(input, this.sanitizeConfig);
    }

    static sanitizeForDOM(input) {
        if (typeof input !== 'string') return input;
        return DOMPurify.sanitize(input, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
            ALLOWED_ATTR: ['href']
        });
    }

    static validateAndSanitizeInput(input, type = 'text') {
        switch(type) {
            case 'html':
                return this.sanitizeHTML(input);
            case 'dom':
                return this.sanitizeForDOM(input);
            case 'text':
                return this.sanitizeText(input);
            default:
                return this.sanitizeText(input);
        }
    }

    static sanitizeText(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>]/g, '');
    }

    static validateFileUpload(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error('Invalid file type');
        }

        if (file.size > maxSize) {
            throw new Error('File too large');
        }

        return true;
    }
}

module.exports = InputValidator;
