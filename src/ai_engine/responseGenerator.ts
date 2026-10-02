export class ResponseGenerator {
  static generateResponse(category: string, ragResolution: string, ticketNumber: string): string {
    return `Dear Customer,\n\nWe have analyzed your complaint ticket [${ticketNumber}] regarding ${category}.\n\nSuggested Resolution:\n${ragResolution}\n\nOur team is working on your request. Thank you for your patience!`;
  }
}
