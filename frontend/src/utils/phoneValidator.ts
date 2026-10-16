/**
 * OMVIK CRM - Client-side Indian Mobile Phone Validator
 * Synchronized with backend/utils/phoneValidator.js
 */

export const DEFAULT_BLOCKLIST = [
  '1234567890',
  '9000000000',
  '9800000001',
  '9999999999',
  '0000000000'
];

export const PHONE_INVALID_REASONS = {
  NOT_10_DIGITS: 'Not 10 digits',
  INVALID_START: 'Must start with 6-9',
  ALL_SAME_DIGIT: 'All digits the same',
  SEQUENTIAL: 'Sequential number',
  REPEATING_PATTERN: 'Repeating pattern',
  FEW_UNIQUE_DIGITS: 'Fewer than 4 unique digits',
  KNOWN_TEST_NUMBER: 'Known test number'
} as const;

export function hasSequenceOf6(digits: string): boolean {
  if (!digits || digits.length < 6) return false;
  let ascCount = 1;
  let descCount = 1;

  for (let i = 0; i < digits.length - 1; i++) {
    const cur = Number(digits[i]);
    const next = Number(digits[i + 1]);

    if (next === (cur + 1) % 10) {
      ascCount++;
      if (ascCount >= 6) return true;
    } else {
      ascCount = 1;
    }

    if (next === (cur - 1 + 10) % 10) {
      descCount++;
      if (descCount >= 6) return true;
    } else {
      descCount = 1;
    }
  }

  return false;
}

export function hasRepeatingPattern(digits: string): boolean {
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

export function cleanSinglePhone(str: any): string {
  if (str === undefined || str === null) return '';
  let s = String(str).trim();
  if (!s) return '';

  // Handle scientific notation e.g. 9.9389E+9
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/i.test(s)) {
    const n = Number(s);
    if (!isNaN(n) && isFinite(n)) {
      s = BigInt(Math.round(n)).toString();
    }
  }

  // Strip trailing .0 (floats)
  s = s.replace(/\.0+$/, '');
  if (/\.\d+$/.test(s)) {
    s = s.replace(/\.\d+$/, '');
  }

  // Strip "p:" or "tel:" prefix
  s = s.replace(/^(?:p|tel|phone)\s*:\s*/i, '');

  // Strip formatting: spaces, dashes, dots, brackets, quotes, slashes
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

export function isValidIndianMobile(
  rawCell: any,
  customBlocklist: string[] = DEFAULT_BLOCKLIST
): {
  isValid: boolean;
  reason: string | null;
  cleanPhone: string;
  secondaryPhone: string | null;
  originalValue: string;
} {
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

  // 1. Delimiter split
  let candidates: string[] = [];
  if (/[,/;&|]/.test(rawStr)) {
    candidates = rawStr.split(/[,/;&|]+/).map(s => s.trim()).filter(Boolean);
  } else {
    const singleClean = cleanSinglePhone(rawStr);
    if (singleClean.length === 10) {
      candidates = [rawStr];
    } else {
      const tokens = rawStr.split(/\s+/).map(s => s.trim()).filter(Boolean);
      const grouped: string[] = [];
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

  const validate10 = (digits: string): { isValid: boolean; reason: string | null; cleanPhone: string } => {
    if (!digits || digits.length !== 10) {
      return { isValid: false, reason: PHONE_INVALID_REASONS.NOT_10_DIGITS, cleanPhone: digits || '' };
    }

    if (/^(\d)\1{9}$/.test(digits)) {
      return { isValid: false, reason: PHONE_INVALID_REASONS.ALL_SAME_DIGIT, cleanPhone: digits };
    }

    if (customBlocklist && customBlocklist.includes(digits)) {
      return { isValid: false, reason: PHONE_INVALID_REASONS.KNOWN_TEST_NUMBER, cleanPhone: digits };
    }

    const last8 = digits.slice(-8);
    if (/^(\d)\1{7}$/.test(last8)) {
      return { isValid: false, reason: PHONE_INVALID_REASONS.KNOWN_TEST_NUMBER, cleanPhone: digits };
    }

    if (!/^[6-9]/.test(digits)) {
      return { isValid: false, reason: PHONE_INVALID_REASONS.INVALID_START, cleanPhone: digits };
    }

    if (hasSequenceOf6(digits)) {
      return { isValid: false, reason: PHONE_INVALID_REASONS.SEQUENTIAL, cleanPhone: digits };
    }

    if (hasRepeatingPattern(digits)) {
      return { isValid: false, reason: PHONE_INVALID_REASONS.REPEATING_PATTERN, cleanPhone: digits };
    }

    const uniqueDigits = new Set(digits.split(''));
    if (uniqueDigits.size < 4) {
      return { isValid: false, reason: PHONE_INVALID_REASONS.FEW_UNIQUE_DIGITS, cleanPhone: digits };
    }

    return { isValid: true, reason: null, cleanPhone: digits };
  };

  if (candidates.length <= 1) {
    const single = candidates[0] || rawStr;
    const cleaned = cleanSinglePhone(single);
    const result = validate10(cleaned);
    return {
      isValid: result.isValid,
      reason: result.reason,
      cleanPhone: result.cleanPhone,
      secondaryPhone: null,
      originalValue: rawStr
    };
  }

  // Multiple candidates
  const evaluated = candidates.map(c => {
    const cleaned = cleanSinglePhone(c);
    return {
      raw: c,
      ...validate10(cleaned)
    };
  });

  const validIndex = evaluated.findIndex(e => e.isValid);
  if (validIndex !== -1) {
    const primary = evaluated[validIndex];
    let secondary: string | null = null;
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

  return {
    isValid: false,
    reason: evaluated[0].reason || PHONE_INVALID_REASONS.NOT_10_DIGITS,
    cleanPhone: evaluated[0].cleanPhone || '',
    secondaryPhone: null,
    originalValue: rawStr
  };
}
