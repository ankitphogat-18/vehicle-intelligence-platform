// Recognized Indian State and Union Territory codes (plus BH Bharat series)
const VALID_STATE_CODES = new Set([
  'AN', 'AP', 'AR', 'AS', 'BH', 'BR', 'CH', 'CG', 'DD', 'DL', 'DN',
  'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH',
  'ML', 'MN', 'MP', 'MZ', 'NL', 'OD', 'OR', 'PB', 'PY', 'RJ', 'SK',
  'TN', 'TR', 'TS', 'UK', 'UP', 'WB'
]);

// Common character confusion maps
const CHAR_TO_DIGIT = {
  'O': '0', 'o': '0', 'Q': '0', 'D': '0',
  'I': '1', 'l': '1', '|': '1', 'i': '1', '!': '1',
  'Z': '2', 'z': '2',
  'E': '3',
  'A': '4',
  'S': '5', 's': '5',
  'G': '6', 'b': '6',
  'T': '7',
  'B': '8',
  'g': '9', 'q': '9'
};

const CHAR_TO_LETTER = {
  '0': 'O',
  '1': 'I',
  '2': 'Z',
  '3': 'E',
  '4': 'A',
  '5': 'S',
  '6': 'G',
  '7': 'T',
  '8': 'B',
  '9': 'P'
};

/**
 * Normalizes and validates Indian vehicle registration strings from raw OCR output.
 * @param {string} rawText 
 * @returns {object} Normalized plate details
 */
function normalizeIndianPlate(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      rawText: '',
      normalizedPlate: '',
      isValidFormat: false,
      stateCode: null,
      rtoCode: null,
      series: null,
      uniqueNumber: null,
      correctionApplied: false
    };
  }

  // 1. Remove whitespace, punctuation, and leading IND/INDIA tokens
  let cleaned = rawText
    .toUpperCase()
    .replace(/^IND\b|^INDIA\b/i, '')
    .replace(/[^A-Z0-9]/g, '');

  if (cleaned.length < 5) {
    return {
      rawText,
      normalizedPlate: cleaned,
      isValidFormat: false,
      stateCode: null,
      rtoCode: null,
      series: null,
      uniqueNumber: null,
      correctionApplied: false
    };
  }

  let originalCleaned = cleaned;
  let correctionApplied = false;

  // 2. Scan for valid Indian State Code starting at offset 0, 1, or 2 (to strip stray HSRP emblem noise like '8', '=', 'S')
  let stateOffset = 0;
  for (let offset = 0; offset <= Math.min(3, cleaned.length - 6); offset++) {
    const candidateState = cleaned.substring(offset, offset + 2)
      .split('')
      .map(c => CHAR_TO_LETTER[c] || c)
      .join('');
    
    // Check if valid state and following character is a digit or digit candidate
    if (VALID_STATE_CODES.has(candidateState)) {
      const nextChar = cleaned[offset + 2];
      if (nextChar && (/[0-9]/.test(nextChar) || CHAR_TO_DIGIT[nextChar])) {
        stateOffset = offset;
        break;
      }
    }
  }

  if (stateOffset > 0) {
    cleaned = cleaned.substring(stateOffset);
    correctionApplied = true;
  }

  // 3. State Code extraction (First 2 characters should be Letters)
  let state = cleaned.substring(0, 2);
  let fixedState = state
    .split('')
    .map(c => CHAR_TO_LETTER[c] || c)
    .join('');

  if (fixedState !== state) {
    cleaned = fixedState + cleaned.substring(2);
    correctionApplied = true;
  }

  // 4. Match Standard Indian Plate Regex
  // Format: 2 letters (State) + 1-2 digits (RTO) + 0-3 letters (Series) + 1-4 digits (Number)
  const standardPattern = /^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{1,4})$/;
  let match = cleaned.match(standardPattern);

  // If strict regex did not match, attempt heuristic positional corrections
  if (!match && cleaned.length >= 8 && cleaned.length <= 11) {
    let s = cleaned.substring(0, 2).split('').map(c => CHAR_TO_LETTER[c] || c).join('');
    let rto = cleaned.substring(2, 4).split('').map(c => CHAR_TO_DIGIT[c] || c).join('');
    let rest = cleaned.substring(4);
    
    // Find where trailing digits start (last 4 digits)
    let digitIdx = -1;
    for (let i = rest.length - 1; i >= 0; i--) {
      if (!/[0-9]/.test(CHAR_TO_DIGIT[rest[i]] || rest[i])) {
        digitIdx = i + 1;
        break;
      }
    }
    
    if (digitIdx === -1 || digitIdx <= rest.length) {
      let seriesLen = Math.max(1, rest.length - 4);
      let series = rest.substring(0, seriesLen).split('').map(c => CHAR_TO_LETTER[c] || c).join('');
      let num = rest.substring(seriesLen).split('').map(c => CHAR_TO_DIGIT[c] || c).join('');
      cleaned = s + rto + series + num;
      match = cleaned.match(standardPattern);
      if (match) correctionApplied = true;
    }
  }

  const isValidFormat = match !== null && VALID_STATE_CODES.has(match[1]);

  return {
    rawText: rawText.trim(),
    normalizedPlate: cleaned,
    isValidFormat,
    stateCode: match ? match[1] : (VALID_STATE_CODES.has(cleaned.substring(0, 2)) ? cleaned.substring(0, 2) : null),
    rtoCode: match ? match[2] : null,
    series: match ? match[3] : null,
    uniqueNumber: match ? match[4] : null,
    correctionApplied: correctionApplied || (originalCleaned !== cleaned)
  };
}

module.exports = {
  normalizeIndianPlate,
  VALID_STATE_CODES
};
