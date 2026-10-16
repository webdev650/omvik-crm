/**
 * OMVIK CRM - Phone Number Validation & Normalization Module
 *
 * Enforces strict verification for Indian mobile numbers:
 * - Exactly 10 digits after cleaning
 * - First digit is 6, 7, 8 or 9
 * - Not all the same digit (e.g. 9999999999, 8888888888)
 * - Not an ascending or descending sequence of 6+ digits (e.g. 9876543210, 9123456789, 7890123456)
 * - Not a repeating pattern of a 1 to 3 digit block across the whole number (e.g. 9898989898, 9879879879)
 * - At least 4 different digits in the number
 * - Not in a configurable blocklist: 1234567890, 9000000000, 9800000001, 9999999999, 0000000000,
 *   and any number whose last 8 digits are all identical.
 */

const DEFAULT_BLOCKLIST = [
  '1234567890',
  '9000000000',
  '9800000001',
  '9999999999',
  '0000000000'
];

const PHONE_INVALID_REASONS = {
  NOT_10_DIGITS: 'Not 10 digits',
  INVALID_START: 'Must start with 6-9',
  ALL_SAME_DIGIT: 'All digits the same',
  SEQUENTIAL: 'Sequential number',
  REPEATING_PATTERN: 'Repeating pattern',
  FEW_UNIQUE_DIGITS: 'Fewer than 4 unique digits',
  KNOWN_TEST_NUMBER: 'Known test number'
};

/**
 * Checks if number contains an ascending or descending sequence of 6+ digits.
 * Supports standard consecutive counting as well as modular wrap-around (e.g. 7890123456).
 */
function hasSequenceOf6(digits) {
  if (!digits || digits.length < 6) return false;
  let ascCount = 1;
  let descCount = 1;

  for (let i = 0; i < digits.length - 1; i++) {
    const cur = Number(digits[i]);
    const next = Number(digits[i + 1]);

    // Ascending: standard (cur + 1 === next) or modular (9 -> 0)
    if (next === (cur + 1) % 10) {
      ascCount++;
      if (ascCount >= 6) return true;
    } else {
      ascCount = 1;
    }

    // Descending: standard (cur - 1 === next) or modular (0 -> 9)
    if (next === (cur - 1 + 10) % 10) {
      descCount++;
      if (descCount >= 6) return true;
    } else {
      descCount = 1;
    }
  }

  return false;
}

/**
 * Checks if number is a repeating pattern of a 1, 2, or 3 digit block across the whole 10 digits.
 * e.g. 9898989898 (block "98" x 5) or 9879879879 (block "987" x 3.33).
 */
function hasRepeatingPattern(digits) {
  if (!digits || digits.length !== 10) return false;
  for (let blockSize = 1; blockSize <= 3; blockSize++) {
    const block = digits.slice(0, blockSize);
    const repeated = block.repeat(Math.ceil(10 / blockSize)).slice(0, 10);
    if (repeated === digits) {
      return true;
    }
  }
  return false;
}

/**
 * Clean and normalize a single phone representation.
 * - Strips "p:", "tel:", spaces, dashes, dots, brackets, trailing ".0"
 * - Handles scientific notation (e.g. 9.9389E+9)
 * - Strips leading +91, 0091, leading 91 (length 12), or leading 0 (length 11)
 */
function cleanSinglePhone(str) {
  if (str === undefined || str === null) return '';
  let s = String(str).trim();
  if (!s) return '';

  // Handle scientific notation (e.g. 9.9389E+9 or 9.9389e+09)
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/i.test(s)) {
    const n = Number(s);
    if (!isNaN(n) && isFinite(n)) {
      s = BigInt(Math.round(n)).toString();
    }
  }

  // Strip trailing float formatting like .0 or .00 or any .d+
  s = s.replace(/\.0+$/, '');
  if (/\.\d+$/.test(s)) {
    s = s.replace(/\.\d+$/, '');
  }

  // Strip prefixes like "p:", "tel:", "phone:"
  s = s.replace(/^(?:p|tel|phone)\s*:\s*/i, '');

  // Strip formatting: spaces, dashes, dots, brackets (), [], quotes, slashes
  s = s.replace(/[\s\-\.\(\)\[\]\\\/'"`,]/g, '');

  // Strip leading international country code +91 or 0091
  if (s.startsWith('+91')) {
    s = s.slice(3);
  } else if (s.startsWith('0091')) {
    s = s.slice(4);
  }

  // Keep only digits
  s = s.replace(/\D/g, '');

  // Remove leading 91 when length is 12
  if (s.length === 12 && s.startsWith('91')) {
    s = s.slice(2);
  }

  // Remove leading 0 when length is 11
  if (s.length === 11 && s.startsWith('0')) {
    s = s.slice(1);
  }

  return s;
}

/**
 * Validates a single 10-digit Indian mobile number against all CRM rules.
 */
function validateSingle10Digit(digits, customBlocklist = DEFAULT_BLOCKLIST) {
  if (!digits || digits.length !== 10) {
    return {
      isValid: false,
      reason: PHONE_INVALID_REASONS.NOT_10_DIGITS,
      cleanPhone: digits || ''
    };
  }

  // 1. Not all the same digit (e.g. 9999999999, 8888888888)
  if (/^(\d)\1{9}$/.test(digits)) {
    return {
      isValid: false,
      reason: PHONE_INVALID_REASONS.ALL_SAME_DIGIT,
      cleanPhone: digits
    };
  }

  // 2. Configurable blocklist (1234567890, 9000000000, etc.)
  if (customBlocklist && customBlocklist.includes(digits)) {
    return {
      isValid: false,
      reason: PHONE_INVALID_REASONS.KNOWN_TEST_NUMBER,
      cleanPhone: digits
    };
  }

  // 3. Any number whose last 8 digits are all identical (e.g. 9800000000, 9811111111)
  const last8 = digits.slice(-8);
  if (/^(\d)\1{7}$/.test(last8)) {
    return {
      isValid: false,
      reason: PHONE_INVALID_REASONS.KNOWN_TEST_NUMBER,
      cleanPhone: digits
    };
  }

  // 4. First digit must be 6, 7, 8 or 9
  if (!/^[6-9]/.test(digits)) {
    return {
      isValid: false,
      reason: PHONE_INVALID_REASONS.INVALID_START,
      cleanPhone: digits
    };
  }

  // 5. Not an ascending or descending sequence of 6+ digits
  if (hasSequenceOf6(digits)) {
    return {
      isValid: false,
      reason: PHONE_INVALID_REASONS.SEQUENTIAL,
      cleanPhone: digits
    };
  }

  // 6. Not a repeating pattern of a 1 to 3 digit block across the whole number
  if (hasRepeatingPattern(digits)) {
    return {
      isValid: false,
      reason: PHONE_INVALID_REASONS.REPEATING_PATTERN,
      cleanPhone: digits
    };
  }

  // 7. At least 4 different digits in the number
  const uniqueDigits = new Set(digits.split(''));
  if (uniqueDigits.size < 4) {
    return {
      isValid: false,
      reason: PHONE_INVALID_REASONS.FEW_UNIQUE_DIGITS,
      cleanPhone: digits
    };
  }

  return {
    isValid: true,
    reason: null,
    cleanPhone: digits
  };
}

/**
 * Universal Indian Mobile Validator (ONE consolidated function).
 *
 * Handles single numbers or cells holding two numbers (separated by comma, slash or space).
 * If cell holds two numbers: takes the first valid one and notes the second in secondaryPhone.
 *
 * @param {string|number} rawCell - Raw phone string or number from Excel/CSV/form/webhook
 * @param {string[]} [customBlocklist] - Optional blocklist overrides
 * @returns {{ isValid: boolean, reason: string|null, cleanPhone: string, secondaryPhone: string|null, originalValue: string }}
 */
function isValidIndianMobile(rawCell, customBlocklist = DEFAULT_BLOCKLIST) {
  if (rawCell === undefined || rawCell === null) {
    return {
      isValid: false,
      reason: PHONE_INVALID_REASONS.NOT_10_DIGITS,
      cleanPhone: '',
      secondaryPhone: null,
      originalValue: ''
    };
  }

  const rawStr = String(rawCell).trim();
  if (!rawStr) {
    return {
      isValid: false,
      reason: PHONE_INVALID_REASONS.NOT_10_DIGITS,
      cleanPhone: '',
      secondaryPhone: null,
      originalValue: rawStr
    };
  }

  // 1. Identify multiple numbers if separated by comma, slash, semicolon, pipe
  let candidates = [];
  if (/[,/;&|]/.test(rawStr)) {
    candidates = rawStr.split(/[,/;&|]+/).map(s => s.trim()).filter(Boolean);
  } else {
    // Check if separated by whitespace
    const singleClean = cleanSinglePhone(rawStr);
    if (singleClean.length === 10) {
      candidates = [rawStr];
    } else {
      // Group tokens if they represent distinct numbers
      const tokens = rawStr.split(/\s+/).map(s => s.trim()).filter(Boolean);
      const grouped = [];
      let current = '';
      for (const tok of tokens) {
        current = current ? `${current} ${tok}` : tok;
        const c = cleanSinglePhone(current);
        if (c.length === 10) {
          grouped.push(current);
          current = '';
        }
      }
      if (current) grouped.push(current);

      if (grouped.length >= 2) {
        candidates = grouped;
      } else {
        candidates = [rawStr];
      }
    }
  }

  // Single candidate
  if (candidates.length <= 1) {
    const single = candidates[0] || rawStr;
    const cleaned = cleanSinglePhone(single);
    const result = validateSingle10Digit(cleaned, customBlocklist);
    return {
      isValid: result.isValid,
      reason: result.reason,
      cleanPhone: result.cleanPhone,
      secondaryPhone: null,
      originalValue: rawStr
    };
  }

  // Multiple candidates in cell:
  // "take the first valid one and note the second in the remarks"
  const evaluated = candidates.map(c => {
    const cleaned = cleanSinglePhone(c);
    return {
      raw: c,
      ...validateSingle10Digit(cleaned, customBlocklist)
    };
  });

  const validIndex = evaluated.findIndex(e => e.isValid);

  if (validIndex !== -1) {
    const primary = evaluated[validIndex];
    let secondary = null;
    for (let i = 0; i < evaluated.length; i++) {
      if (i !== validIndex) {
        secondary = evaluated[i].cleanPhone || cleanSinglePhone(evaluated[i].raw) || evaluated[i].raw;
        break;
      }
    }

    return {
      isValid: true,
      reason: null,
      cleanPhone: primary.cleanPhone,
      secondaryPhone: secondary,
      originalValue: rawStr
    };
  }

  // None of the numbers were valid
  return {
    isValid: false,
    reason: evaluated[0].reason || PHONE_INVALID_REASONS.NOT_10_DIGITS,
    cleanPhone: evaluated[0].cleanPhone || '',
    secondaryPhone: null,
    originalValue: rawStr
  };
}

module.exports = {
  isValidIndianMobile,
  cleanSinglePhone,
  normalizePhone: cleanSinglePhone,
  hasSequenceOf6,
  hasRepeatingPattern,
  DEFAULT_BLOCKLIST,
  PHONE_INVALID_REASONS
};
