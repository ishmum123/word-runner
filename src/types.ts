export type Language = 'chinese' | 'arabic';

export interface Word {
  target: string;
  pronunciation: string;
  english: string;
  category: string;
}

export interface WordLevel {
  level: number;
  words: Word[];
}

export interface GameState {
  score: number;
  lives: number;
  distance: number;
  currentLevel: number;
  streak: number;
  correctAnswers: number;
  totalAnswers: number;
  speed: number;
}

export interface GameStats {
  finalScore: number;
  distance: number;
  correctAnswers: number;
  totalAnswers: number;
  maxStreak: number;
  highestLevel: number;
  useCustomDeck?: boolean;
}

export type Lane = 'left' | 'center' | 'right';

export type QuestionMode = 'english-to-target' | 'target-to-english';
