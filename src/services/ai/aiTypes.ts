/**
 * @license
 * SENA Learning Hub - Definiciones de Tipos y Control de Acceso para Herramientas IA
 * PROMPT 15.1: Separación estricta de autorización por rol institucional
 */

export const APPRENTICE_ALLOWED_TOOLS = [
  'correct_english',
  'conversation_practice',
  'script_generator',
  'grammar_assistant',
  'vocabulary_builder',
] as const;

export const INSTRUCTOR_ONLY_TOOLS = [
  'activity_generator',
  'question_generator',
  'feedback_assistant',
  'material_generator',
] as const;

export type ApprenticeToolType = (typeof APPRENTICE_ALLOWED_TOOLS)[number];
export type InstructorToolType = (typeof INSTRUCTOR_ONLY_TOOLS)[number];
export type AiToolType = ApprenticeToolType | InstructorToolType;

export interface CorrectionResult {
  original: string;
  corrected: string;
  explanation: string;
  improved: string;
  translation: string;
}

export interface GrammarExplanationResult {
  topic: string;
  explanation: string;
  examples: Array<{ en: string; es: string }>;
  exercises: Array<{ question: string; options?: string[]; hint?: string }>;
  answers: Array<{ questionNumber: number; answer: string; reason: string }>;
}

export interface VocabularyTerm {
  term: string;
  category: string;
  translation: string;
  definition: string;
  example: string;
}

export interface ActivityProposalResult {
  title: string;
  objective: string;
  instructions: string;
  vocabulary: string[];
  grammarFocus: string;
  procedure: string[];
  evidenceRequired: string;
  assessmentCriteria: string[];
}

export interface QuestionItem {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ScriptParams {
  topic: string;
  evidenceType: string;
  level: string;
  duration: string;
  vocationalContext?: string;
}

export interface ActivityParams {
  program: string;
  ficha: string;
  competency: string;
  learningOutcome: string;
  cefrLevel: string;
  topic: string;
  activityType: string;
}

export interface QuestionParams {
  topic: string;
  cefrLevel: string;
  questionType: string;
  count: number;
  occupationalContext?: string;
}

export interface FeedbackParams {
  learnerPerformance: string;
  language: 'es' | 'en';
  strengths?: string;
  areasToImprove?: string;
  activityTitle?: string;
}

export interface MaterialParams {
  materialType: string;
  topic: string;
  cefrLevel: string;
  occupationalContext: string;
}
