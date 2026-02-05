import type { Word } from '../types';
import { hsk1Words } from './hsk1';
import { hsk2Words } from './hsk2';
import { hsk3Words } from './hsk3';
import { hsk4Words } from './hsk4';
import { hsk5Words } from './hsk5';
import { hsk6Words } from './hsk6';

export const hskWordsByLevel: Record<number, Word[]> = {
  1: hsk1Words,
  2: hsk2Words,
  3: hsk3Words,
  4: hsk4Words,
  5: hsk5Words,
  6: hsk6Words,
};

export function getWordsForLevel(level: number): Word[] {
  return hskWordsByLevel[level] || [];
}

export function getAllWords(): Word[] {
  return Object.values(hskWordsByLevel).flat();
}
