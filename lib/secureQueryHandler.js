const { Op } = require('sequelize');
const sanitizer = require('sanitize-html');

class SecureQueryHandler {
    static sanitizeInput(input) {
        if (typeof input === 'string') {
            return sanitizer(input, {
                allowedTags: [],
                allowedAttributes: {}
            });
        }
        return input;
    }

    static buildSecureQuery(params) {
        const sanitizedParams = {};
        for (const [key, value] of Object.entries(params)) {
            sanitizedParams[key] = this.sanitizeInput(value);
        }
        return sanitizedParams;
    }

    static async secureFind(model, params) {
        const sanitizedParams = this.buildSecureQuery(params);
        return model.findOne({ 
            where: sanitizedParams,
            // Add any necessary security restrictions
            attributes: { 
                exclude: ['password', 'token'] // exclude sensitive fields
            }
        });
    }

    static async secureUpdate(model, values, conditions) {
        const sanitizedValues = this.buildSecureQuery(values);
        const sanitizedConditions = this.buildSecureQuery(conditions);
        
        return model.update(sanitizedValues, { 
            where: sanitizedConditions,
            // Add additional security restrictions as needed
            fields: model.updatableFields || [] // only allow specific fields to be updated
        });
    }
}

module.exports = SecureQueryHandler;
