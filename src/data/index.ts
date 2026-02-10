import type { Word, Language } from '../types';
import { getChineseWordsForLevel } from './chinese';
import { getArabicWordsForLevel } from './arabic';

export function getWordsForLevel(level: number, language: Language = 'chinese'): Word[] {
  if (language === 'arabic') {
    return getArabicWordsForLevel(level);
  }
  return getChineseWordsForLevel(level);
}

export function getAllWords(language: Language = 'chinese'): Word[] {
  if (language === 'arabic') {
    return [1, 2, 3, 4, 5, 6].flatMap(level => getArabicWordsForLevel(level));
  }
  return [1, 2, 3, 4, 5, 6].flatMap(level => getChineseWordsForLevel(level));
}
