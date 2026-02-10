import type { Word, Language } from '../types';
import { getChineseWordsForLevel } from './chinese';
import { getArabicWordsForLevel } from './arabic';
import { getJapaneseWordsForLevel } from './japanese';

export function getWordsForLevel(level: number, language: Language = 'chinese'): Word[] {
  if (language === 'arabic') {
    return getArabicWordsForLevel(level);
  }
  if (language === 'japanese') {
    return getJapaneseWordsForLevel(level);
  }
  return getChineseWordsForLevel(level);
}

export function getAllWords(language: Language = 'chinese'): Word[] {
  if (language === 'arabic') {
    return [1, 2, 3, 4, 5, 6].flatMap(level => getArabicWordsForLevel(level));
  }
  if (language === 'japanese') {
    return [1, 2, 3, 4, 5, 6].flatMap(level => getJapaneseWordsForLevel(level));
  }
  return [1, 2, 3, 4, 5, 6].flatMap(level => getChineseWordsForLevel(level));
}
