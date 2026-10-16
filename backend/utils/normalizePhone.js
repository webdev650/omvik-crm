const { cleanSinglePhone } = require('./phoneValidator');

/**
 * Normalizes phone numbers by stripping "p:", spaces, dashes, dots, brackets,
 * trailing ".0", scientific notation, and removing leading country codes (+91, 0091, 91, or leading 0).
 * Returns a clean 10-digit phone string.
 */
function normalizePhone(phone) {
  return cleanSinglePhone(phone);
}

module.exports = normalizePhone;
