import type { Word } from '../../types';
import { arabic1Words } from './level1';
import { arabic2Words } from './level2';
import { arabic3Words } from './level3';
import { arabic4Words } from './level4';
import { arabic5Words } from './level5';
import { arabic6Words } from './level6';

const arabicWordsByLevel: Record<number, Word[]> = {
  1: arabic1Words,
  2: arabic2Words,
  3: arabic3Words,
  4: arabic4Words,
  5: arabic5Words,
  6: arabic6Words,
};

export function getArabicWordsForLevel(level: number): Word[] {
  return arabicWordsByLevel[level] || [];
}
