export interface SentimentEmotionResult {
  sentiment: 'Negative' | 'Neutral' | 'Positive';
  sentimentScore: number; // -1.0 to +1.0
  emotion: 'Anger' | 'Frustration' | 'Neutral' | 'Satisfaction';
  urgency: 'Low' | 'Medium' | 'High';
  severityScore: number; // 0 to 100
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class SentimentEmotionEvaluator {
  private static negativeWords = ['terrible', 'worst', 'horrible', 'crashed', 'urgent', 'disaster', 'scam', 'unacceptable', 'fraud', 'angry', 'broken', 'overcharged', 'lawsuit', 'failed', 'immediately', 'outage', 'emergency'];
  private static positiveWords = ['love', 'great', 'awesome', 'thanks', 'happy', 'pleased', 'good', 'excellent', 'feature', 'suggestion', 'kindly'];
  private static urgencyWords = ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'blocker', 'outage', 'lawsuit', 'data loss'];

  static evaluate(text: string): SentimentEmotionResult {
    const lower = text.toLowerCase();
    const tokens = lower.split(/\W+/);

    let score = 0;
    let urgencyCount = 0;

    tokens.forEach((w) => {
      if (this.negativeWords.includes(w)) score -= 0.25;
      if (this.positiveWords.includes(w)) score += 0.20;
      if (this.urgencyWords.includes(w)) urgencyCount++;
    });

    score = Math.max(-1.0, Math.min(1.0, parseFloat(score.toFixed(2))));

    let sentiment: 'Negative' | 'Neutral' | 'Positive' = 'Neutral';
    if (score <= -0.3) sentiment = 'Negative';
    else if (score >= 0.3) sentiment = 'Positive';

    let emotion: 'Anger' | 'Frustration' | 'Neutral' | 'Satisfaction' = 'Neutral';
    if (score <= -0.6 || urgencyCount >= 2) emotion = 'Anger';
    else if (score <= -0.2) emotion = 'Frustration';
    else if (score >= 0.4) emotion = 'Satisfaction';

    let severity = Math.round(Math.abs(score) * 40 + urgencyCount * 25 + 35);
    severity = Math.min(99, Math.max(10, severity));

    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (severity >= 85 || urgencyCount >= 2) priority = 'CRITICAL';
    else if (severity >= 65 || urgencyCount === 1) priority = 'HIGH';
    else if (severity >= 40) priority = 'MEDIUM';

    let urgency: 'Low' | 'Medium' | 'High' = 'Low';
    if (urgencyCount >= 2 || priority === 'CRITICAL') urgency = 'High';
    else if (urgencyCount === 1 || priority === 'HIGH') urgency = 'Medium';

    return {
      sentiment,
      sentimentScore: score,
      emotion,
      urgency,
      severityScore: severity,
      priority,
    };
  }
}
