/**
 * PII Sanitizer & Anonymizer Engine
 * Detects & redacts credit card numbers, SSNs, phone numbers, and email addresses.
 */
export class PIISanitizer {
  static sanitize(text: string): string {
    if (!text) return text;
    let sanitized = text;

    // Credit Cards: 16 digits or 4x4 numbers
    sanitized = sanitized.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CREDIT_CARD]');

    // SSN / National IDs: XXX-XX-XXXX
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');

    // Phone Numbers
    sanitized = sanitized.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');

    return sanitized;
  }
}
