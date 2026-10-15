const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');

function safeCompare(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Avoid timing leak on length mismatch
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

const verifyApiKey = async (req, res, next) => {
  try {
    const rawKey = req.headers['x-api-key'];

    if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
      return res.status(401).json({ message: 'API key required in x-api-key header' });
    }

    const trimmedKey = rawKey.trim();

    // Check optional env fallback if configured
    const envKey = process.env.PUBLIC_LEADS_API_KEY || process.env.WEBHOOK_API_KEY;
    if (envKey && safeCompare(trimmedKey, envKey)) {
      req.apiKey = { name: 'ENV_PUBLIC_LEADS_KEY', isActive: true };
      return next();
    }

    const keyHash = crypto.createHash('sha256').update(trimmedKey).digest('hex');

    const apiKeyDoc = await ApiKey.findOne({ isActive: true, keyHash }).select('+keyHash');
    if (!apiKeyDoc || !safeCompare(keyHash, apiKeyDoc.keyHash)) {
      return res.status(401).json({ message: 'Invalid or inactive API key' });
    }

    req.apiKey = apiKeyDoc;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyApiKey };
