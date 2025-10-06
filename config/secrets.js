const crypto = require('crypto');

function generateSecureKey() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
    hmacKey: process.env.HMAC_KEY || generateSecureKey(),
    jwtSecret: process.env.JWT_SECRET || generateSecureKey()
};
