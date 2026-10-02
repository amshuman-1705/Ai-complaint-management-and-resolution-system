export interface ExtractedEntity {
  entityType: string;
  value: string;
  confidence: number;
}

export class EntityExtractor {
  static extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Invoice / Transaction IDs
    const invoiceMatch = text.match(/#?(INV|TXN|CMP|ACC)-\d{4,8}/gi);
    if (invoiceMatch) {
      invoiceMatch.forEach((val) => entities.push({ entityType: 'TRANSACTION_ID', value: val.toUpperCase(), confidence: 0.98 }));
    }

    // Currency Amounts
    const amountMatch = text.match(/\$\d+(\.\d{2})?/g);
    if (amountMatch) {
      amountMatch.forEach((val) => entities.push({ entityType: 'MONETARY_AMOUNT', value: val, confidence: 0.95 }));
    }

    // Error HTTP Codes
    const errorCodeMatch = text.match(/\b(500|502|504|404|401|403)\b/g);
    if (errorCodeMatch) {
      errorCodeMatch.forEach((val) => entities.push({ entityType: 'HTTP_ERROR_CODE', value: val, confidence: 0.96 }));
    }

    return entities;
  }
}
