import type { Word, Language } from '../types';
import { hsk1Words } from './hsk1';
import { hsk2Words } from './hsk2';
import { hsk3Words } from './hsk3';
import { hsk4Words } from './hsk4';
import { hsk5Words } from './hsk5';
import { hsk6Words } from './hsk6';
import { getArabicWordsForLevel } from './arabic';

const chineseWordsByLevel: Record<number, Word[]> = {
  1: hsk1Words,
  2: hsk2Words,
  3: hsk3Words,
  4: hsk4Words,
  5: hsk5Words,
  6: hsk6Words,
};

export function getWordsForLevel(level: number, language: Language = 'chinese'): Word[] {
  if (language === 'arabic') {
    return getArabicWordsForLevel(level);
  }
  return chineseWordsByLevel[level] || [];
}

export function getAllWords(language: Language = 'chinese'): Word[] {
  if (language === 'arabic') {
    return [1, 2, 3, 4, 5, 6].flatMap(level => getArabicWordsForLevel(level));
  }
  return Object.values(chineseWordsByLevel).flat();
}
