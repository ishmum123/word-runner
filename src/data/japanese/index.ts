import type { Word } from '../../types';
import { japanese1Words } from './level1';
import { japanese2Words } from './level2';
import { japanese3Words } from './level3';
import { japanese4Words } from './level4';
import { japanese5Words } from './level5';
import { japanese6Words } from './level6';

const japaneseWordsByLevel: Record<number, Word[]> = {
  1: japanese1Words,
  2: japanese2Words,
  3: japanese3Words,
  4: japanese4Words,
  5: japanese5Words,
  6: japanese6Words,
};

export function getJapaneseWordsForLevel(level: number): Word[] {
  return japaneseWordsByLevel[level] || [];
}
