export class IntentExtractor {
  static extractIntents(text: string): string[] {
    const intents: string[] = [];
    const lower = text.toLowerCase();

    if (lower.includes('refund') || lower.includes('money back') || lower.includes('overcharged')) {
      intents.push('REQUEST_REFUND');
    }
    if (lower.includes('cancel') || lower.includes('stop subscription')) {
      intents.push('CANCEL_SERVICE');
    }
    if (lower.includes('fix') || lower.includes('bug') || lower.includes('error') || lower.includes('crash')) {
      intents.push('REPORT_TECHNICAL_BUG');
    }
    if (lower.includes('reset') || lower.includes('password') || lower.includes('access')) {
      intents.push('REQUEST_ACCESS_RESET');
    }
    if (lower.includes('speak to manager') || lower.includes('urgent') || lower.includes('unacceptable')) {
      intents.push('ESCALATE_TO_HUMAN');
    }

    if (intents.length === 0) intents.push('GENERAL_SUPPORT_QUERY');
    return intents;
  }
}
