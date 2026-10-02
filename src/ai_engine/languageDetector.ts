export class LanguageDetector {
  static detectLanguage(text: string): { language: string; confidence: number } {
    if (!text) return { language: 'en', confidence: 1.0 };
    const lower = text.toLowerCase();

    if (lower.includes('hola') || lower.includes('gracias') || lower.includes('por favor')) {
      return { language: 'es', confidence: 0.95 };
    }
    if (lower.includes('bonjour') || lower.includes('merci') || lower.includes('s\'il vous plaît')) {
      return { language: 'fr', confidence: 0.95 };
    }
    if (lower.includes('namaste') || lower.includes('kripya')) {
      return { language: 'hi', confidence: 0.90 };
    }

    return { language: 'en', confidence: 0.99 };
  }
}
