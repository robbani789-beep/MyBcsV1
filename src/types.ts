export interface Subtopic {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  subtopics?: Subtopic[];
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  topics: Topic[];
}

export type TopicStatus = 'to-read' | 'reading' | 'completed';

export interface ProgressState {
  // mapping: subjId -> topicId -> TopicStatus
  [subjId: string]: {
    [topicId: string]: TopicStatus;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type TutorMode = 'tutor' | 'socratic' | 'exam';

export interface Flashcard {
  q: string;
  a: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface TopicMaterials {
  summary?: string;
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  notes?: string;
}

export interface MaterialsState {
  // key of form "subjId_topicId"
  [topicKey: string]: TopicMaterials;
}

export type ApiProvider = 'gemini' | 'openrouter';

export interface ApiConfig {
  provider: ApiProvider;
  geminiKey: string;
  geminiModel: string;
  openrouterKey: string;
  openrouterModel: string;
}

export interface SharedStopwatch {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number;
}

