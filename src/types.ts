export interface Word {
  chinese: string;
  pinyin: string;
  english: string;
  category: string;
}

export interface HSKLevel {
  level: number;
  words: Word[];
}

export interface GameState {
  score: number;
  lives: number;
  distance: number;
  currentHSK: number;
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
  highestHSK: number;
}

export type Lane = 'left' | 'center' | 'right';

export type QuestionMode = 'english-to-chinese' | 'chinese-to-english';
