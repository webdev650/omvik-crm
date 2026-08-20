const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');

const verifyApiKey = async (req, res, next) => {
  try {
    const rawKey = req.headers['x-api-key'];

    if (!rawKey) {
      return res.status(401).json({ message: 'API key required in x-api-key header' });
    }

    const keyHash = crypto.createHash('sha256').update(rawKey.trim()).digest('hex');

    const apiKeyDoc = await ApiKey.findOne({ keyHash, isActive: true }).select('+keyHash');
    if (!apiKeyDoc) {
      return res.status(401).json({ message: 'Invalid or inactive API key' });
    }

    req.apiKey = apiKeyDoc;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyApiKey };
