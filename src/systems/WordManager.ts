import type { Word, Lane, QuestionMode } from '../types';
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

  generateQuestion(hskLevel: number): WordQuestion {
    const words = this.getAvailableWords(hskLevel);

    // Select correct word (not recently used)
    const availableWords = words.filter(w => !this.recentWords.includes(w.chinese));
    const correctWord = availableWords[Math.floor(Math.random() * availableWords.length)]
      || words[Math.floor(Math.random() * words.length)];

    // Track recent word
    this.recentWords.push(correctWord.chinese);
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
    const mode: QuestionMode = Math.random() < 0.5 ? 'english-to-chinese' : 'chinese-to-english';

    return { correctWord, options, correctLane, mode };
  }

  private getAvailableWords(hskLevel: number): Word[] {
    // Get words from current level and one below (if available)
    const currentWords = getWordsForLevel(hskLevel);
    const prevWords = hskLevel > 1 ? getWordsForLevel(hskLevel - 1) : [];
    return [...currentWords, ...prevWords];
  }

  private getDistractors(correctWord: Word, _hskLevel: number, pool: Word[]): Word[] {
    const distractors: Word[] = [];
    const sameCategoryWords = pool.filter(
      w => w.category === correctWord.category && w.chinese !== correctWord.chinese
    );

    // Prefer same category distractors
    const shuffledCategory = this.shuffle([...sameCategoryWords]);
    const shuffledPool = this.shuffle(pool.filter(w => w.chinese !== correctWord.chinese));

    // First try to get same category words
    for (const word of shuffledCategory) {
      if (distractors.length >= 2) break;
      if (!distractors.some(d => d.chinese === word.chinese)) {
        distractors.push(word);
      }
    }

    // Fill remaining with random words
    for (const word of shuffledPool) {
      if (distractors.length >= 2) break;
      if (!distractors.some(d => d.chinese === word.chinese)) {
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
}
