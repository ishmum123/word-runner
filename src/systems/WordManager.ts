import type { Word, Lane, QuestionMode, Language } from '../types';
import { getWordsForLevel } from '../data';

export interface WordQuestion {
  correctWord: Word;
  options: { lane: Lane; word: Word }[];
  correctLane: Lane;
  mode: QuestionMode;
}

export class WordManager {
  private recentWords: string[] = [];
  private readonly maxRecentWords = 20;
  private customWords: Word[] | null = null;
  private language: Language;

  constructor(language: Language = 'chinese') {
    this.language = language;
  }

  setCustomWords(words: Word[]): void {
    this.customWords = words;
  }

  hasCustomWords(): boolean {
    return this.customWords !== null && this.customWords.length > 0;
  }

  generateQuestion(hskLevel: number): WordQuestion {
    const words = this.customWords && this.customWords.length > 0
      ? this.customWords
      : this.getAvailableWords(hskLevel);

    // Select correct word (not recently used)
    const availableWords = words.filter(w => !this.recentWords.includes(w.target));
    const correctWord = availableWords[Math.floor(Math.random() * availableWords.length)]
      || words[Math.floor(Math.random() * words.length)];

    // Track recent word
    this.recentWords.push(correctWord.target);
    if (this.recentWords.length > this.maxRecentWords) {
      this.recentWords.shift();
    }

    // Generate distractors from same or adjacent level
    const distractors = this.getDistractors(correctWord, hskLevel, words);

    // Randomly assign to lanes
    const lanes: Lane[] = ['left', 'center', 'right'];
    const correctLaneIndex = Math.floor(Math.random() * 3);
    const correctLane = lanes[correctLaneIndex];

    const options: { lane: Lane; word: Word }[] = [];
    let distractorIndex = 0;

    for (let i = 0; i < 3; i++) {
      if (i === correctLaneIndex) {
        options.push({ lane: lanes[i], word: correctWord });
      } else {
        options.push({ lane: lanes[i], word: distractors[distractorIndex++] });
      }
    }

    // Randomly choose question mode
    const mode: QuestionMode = Math.random() < 0.5 ? 'english-to-target' : 'target-to-english';

    return { correctWord, options, correctLane, mode };
  }

  private getAvailableWords(hskLevel: number): Word[] {
    // Get words from current level and one below (if available)
    const currentWords = getWordsForLevel(hskLevel, this.language);
    const prevWords = hskLevel > 1 ? getWordsForLevel(hskLevel - 1, this.language) : [];
    return [...currentWords, ...prevWords];
  }

  private getDistractors(correctWord: Word, _hskLevel: number, pool: Word[]): Word[] {
    const distractors: Word[] = [];
    const sameCategoryWords = pool.filter(
      w => w.category === correctWord.category && w.target !== correctWord.target
    );

    // Prefer same category distractors
    const shuffledCategory = this.shuffle([...sameCategoryWords]);
    const shuffledPool = this.shuffle(pool.filter(w => w.target !== correctWord.target));

    // First try to get same category words
    for (const word of shuffledCategory) {
      if (distractors.length >= 2) break;
      if (!distractors.some(d => d.target === word.target)) {
        distractors.push(word);
      }
    }

    // Fill remaining with random words
    for (const word of shuffledPool) {
      if (distractors.length >= 2) break;
      if (!distractors.some(d => d.target === word.target)) {
        distractors.push(word);
      }
    }

    return distractors;
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  reset(): void {
    this.recentWords = [];
  }

  clearCustomWords(): void {
    this.customWords = null;
  }
}
