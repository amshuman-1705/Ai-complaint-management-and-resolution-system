export class TextPreprocessor {
  static preprocess(text: string): { cleanText: string; tokens: string[] } {
    if (!text) return { cleanText: '', tokens: [] };

    // Lowercase & remove noise
    const cleanText = text.trim();
    const tokens = cleanText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    return { cleanText, tokens };
  }
}
