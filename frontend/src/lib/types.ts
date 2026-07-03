export type QuestionnaireSummary = {
  id: string;
  title: string;
  created_at: string;
};

export type EvidenceItem = {
  id: string;
  score: number;
  fileName: string;
  snippet: string;
  mimeType: string;
};

export type Question = {
  id: string;
  prompt: string;
  answerType: "text" | "number";
  regex?: string | null;
  evidence: EvidenceItem[];
};

export type QuestionnaireDetails = {
  id: string;
  title: string;
  created_at: string;
  questions: Question[];
};
