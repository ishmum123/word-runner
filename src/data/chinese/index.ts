import type { Word } from '../../types';
import { chinese1Words } from './level1';
import { chinese2Words } from './level2';
import { chinese3Words } from './level3';
import { chinese4Words } from './level4';
import { chinese5Words } from './level5';
import { chinese6Words } from './level6';

const chineseWordsByLevel: Record<number, Word[]> = {
  1: chinese1Words,
  2: chinese2Words,
  3: chinese3Words,
  4: chinese4Words,
  5: chinese5Words,
  6: chinese6Words,
};

export function getChineseWordsForLevel(level: number): Word[] {
  return chineseWordsByLevel[level] || [];
}
