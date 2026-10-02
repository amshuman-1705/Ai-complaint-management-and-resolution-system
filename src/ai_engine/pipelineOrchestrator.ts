import { LanguageDetector } from './languageDetector';
import { TextPreprocessor } from './textPreprocessor';
import { ComplaintClassifier } from './classifier';
import { IntentExtractor } from './intentExtractor';
import { EntityExtractor } from './entityExtractor';
import { SentimentEmotionEvaluator } from './sentimentEmotionEvaluator';
import { DuplicateDetector } from './duplicateDetector';
import { DepartmentRouter } from './departmentRouter';
import { RAGRetriever } from './ragRetriever';
import { ResponseGenerator } from './responseGenerator';
import { ConfidenceExplainer } from './confidenceExplainer';
import { prisma } from '../config/db';
import { AuditRepository } from '../repositories/auditRepository';

export interface StructuredAIOutput {
  category: string;
  subcategory: string;
  intents: string[];
  entities: Array<{ entityType: string; value: string; confidence: number }>;
  sentiment: string;
  sentiment_score: number;
  emotion: string;
  urgency: string;
  severity: number;
  priority: string;
  duplicate_complaints: string[];
  related_complaints: string[];
  recommended_department: string;
  recommended_resolution: string;
  ai_draft_response: string;
  confidence: number;
  is_ai_abstained: boolean;
  explanation: {
    featureDrivers: Array<{ word: string; weight: number }>;
    rationale: string;
  };
}

export class AIPipelineOrchestrator {
  /**
   * Executes the full 15-stage AI Pipeline sequentially and persists structured predictions in the database.
   */
  static async processComplaintPipeline(orgId: string, complaintId: string): Promise<StructuredAIOutput> {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { customer: true },
    });

    if (!complaint || complaint.orgId !== orgId) {
      throw { statusCode: 404, message: 'Complaint ticket not found for AI processing.' };
    }

    const fullContent = complaint.title + ' ' + complaint.description;

    // Stage 1: Language Detection
    const lang = LanguageDetector.detectLanguage(fullContent);

    // Stage 2: Text Preprocessing
    const { cleanText } = TextPreprocessor.preprocess(fullContent);

    // Stage 3 & 4: Classification & Configurable Subcategory Detection
    const classification = await ComplaintClassifier.classify(orgId, cleanText);

    // Stage 5: Intent Detection
    const intents = IntentExtractor.extractIntents(cleanText);

    // Stage 6: Entity Extraction (NER)
    const entities = EntityExtractor.extractEntities(fullContent);

    // Stage 7, 8, 9, 10, 11: Sentiment, Emotion, Urgency, Severity & Priority Prediction
    const sentimentEval = SentimentEmotionEvaluator.evaluate(cleanText);

    // Stage 12: Duplicate & Related Complaint Detection
    const dupResult = await DuplicateDetector.detect(orgId, complaintId, cleanText);

    // Stage 13: Department Recommendation
    const deptRec = await DepartmentRouter.recommendDepartment(orgId, classification.categoryName, cleanText);

    // Stage 14: RAG Knowledge Base Retrieval & Resolution Recommendation
    const ragResult = await RAGRetriever.retrieveAndRecommend(orgId, cleanText);

    // Stage 15: AI Response Generation
    const draftResponse = ResponseGenerator.generateResponse(classification.categoryName, ragResult.recommendedResolution, complaint.ticketNumber);

    // Stage 16: Confidence Evaluation & Explainable AI (XAI)
    const confEval = ConfidenceExplainer.evaluateConfidenceAndExplain(
      classification.confidence,
      ragResult.groundedScore,
      cleanText,
      sentimentEval.priority
    );

    const structuredOutput: StructuredAIOutput = {
      category: classification.categoryName,
      subcategory: classification.subCategory,
      intents,
      entities,
      sentiment: sentimentEval.sentiment,
      sentiment_score: sentimentEval.sentimentScore,
      emotion: sentimentEval.emotion,
      urgency: sentimentEmotionEvaluatorUrgency(sentimentEval.urgency),
      severity: sentimentEval.severityScore,
      priority: sentimentEval.priority,
      duplicate_complaints: dupResult.duplicateComplaints,
      related_complaints: dupResult.relatedComplaints,
      recommended_department: deptRec.deptName,
      recommended_resolution: ragResult.recommendedResolution,
      ai_draft_response: draftResponse,
      confidence: confEval.confidence,
      is_ai_abstained: confEval.isAiAbstained,
      explanation: confEval.explanation,
    };

    // Database Persistence: Save Predictions, Explanations, & Updates
    await prisma.$transaction([
      // Update Complaint Priority & Severity
      prisma.complaint.update({
        where: { id: complaintId },
        data: {
          priority: sentimentEval.priority as any,
          severityScore: sentimentEval.severityScore,
          sentimentScore: sentimentEval.sentimentScore,
          categoryId: classification.categoryId || undefined,
          deptId: deptRec.deptId || undefined,
          status: confEval.isAiAbstained ? 'TRIAGED' : 'AI_PROCESSING',
        },
      }),

      // Save AI Predictions Model Record
      prisma.aIPrediction.upsert({
        where: { complaintId },
        update: {
          predictedCategoryId: classification.categoryId,
          predictedSubCategory: classification.subCategory,
          confidenceScore: confEval.confidence,
          isAiAbstained: confEval.isAiAbstained,
          intents: JSON.stringify(intents),
          detectedEntities: JSON.stringify(entities),
          duplicateComplaints: JSON.stringify(dupResult.duplicateComplaints),
          relatedComplaints: JSON.stringify(dupResult.relatedComplaints),
          recommendedResolution: ragResult.recommendedResolution,
          detectedLanguage: lang.language,
          processedAt: new Date(),
        },
        create: {
          orgId,
          complaintId,
          predictedCategoryId: classification.categoryId,
          predictedSubCategory: classification.subCategory,
          confidenceScore: confEval.confidence,
          isAiAbstained: confEval.isAiAbstained,
          intents: JSON.stringify(intents),
          detectedEntities: JSON.stringify(entities),
          duplicateComplaints: JSON.stringify(dupResult.duplicateComplaints),
          relatedComplaints: JSON.stringify(dupResult.relatedComplaints),
          recommendedResolution: ragResult.recommendedResolution,
          detectedLanguage: lang.language,
          modelVersion: 'DeBERTa-v3-Mistral-RAG-v1.2',
        },
      }),

      // Save AI Explanation (XAI SHAP Feature Drivers)
      prisma.aIExplanation.upsert({
        where: { complaintId },
        update: {
          topFeatureKeywords: JSON.stringify(confEval.explanation.featureDrivers),
          decisionRationale: confEval.explanation.rationale,
        },
        create: {
          orgId,
          complaintId,
          topFeatureKeywords: JSON.stringify(confEval.explanation.featureDrivers),
          decisionRationale: confEval.explanation.rationale,
        },
      }),

      // Save RAG Draft Recommendation
      prisma.resolutionRecommendation.create({
        data: {
          orgId,
          complaintId,
          recommendedDraftText: ragResult.recommendedResolution,
          groundedConfidenceScore: ragResult.groundedScore,
          referencedSourceChunks: JSON.stringify(ragResult.sourceDocs),
        },
      }),
    ]);

    await AuditRepository.log({
      orgId,
      actionType: 'AI_PIPELINE_EXECUTED',
      targetEntity: 'complaints',
      details: JSON.stringify({
        complaintId,
        category: classification.categoryName,
        confidence: confEval.confidence,
        isAbstained: confEval.isAiAbstained,
      }),
    });

    return structuredOutput;
  }
}

function sentimentEmotionEvaluatorUrgency(urgency: string): string {
  return urgency;
}
