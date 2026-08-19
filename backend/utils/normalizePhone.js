/**
 * Normalizes phone numbers by stripping non-digit characters
 * and removing leading country codes (+91, 91, or leading 0).
 * Returns a clean 10-digit phone string.
 *
 * Examples:
 * "+91 98765 43210" -> "9876543210"
 * "919876543210"   -> "9876543210"
 * "09876543210"    -> "9876543210"
 * "98765-43210"    -> "9876543210"
 */
function normalizePhone(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  let digits = String(phone).replace(/\D/g, '');

  // Handle +91 or 91 country code prefix (for 12-digit strings)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  // Handle leading 0 (for 11-digit strings)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits;
}

module.exports = normalizePhone;
