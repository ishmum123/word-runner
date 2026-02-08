import type { Word } from '../types';

export interface CSVParseResult {
  words: Word[];
  errors: string[];
}

export function parseAnkiCSV(csvContent: string): CSVParseResult {
  const words: Word[] = [];
  const errors: string[] = [];

  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length === 0) {
    errors.push('Empty CSV file');
    return { words, errors };
  }

  // Try to detect header row and column mapping
  const firstLine = lines[0].toLowerCase();
  let hasHeader = false;
  let columnMap: Record<string, number> = {};

  // Check if first line looks like a header
  if (
    firstLine.includes('chinese') ||
    firstLine.includes('pinyin') ||
    firstLine.includes('english') ||
    firstLine.includes('hanzi') ||
    firstLine.includes('meaning') ||
    firstLine.includes('front') ||
    firstLine.includes('back') ||
    firstLine.includes('target') ||
    firstLine.includes('pronunciation') ||
    firstLine.includes('arabic')
  ) {
    hasHeader = true;
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

    headers.forEach((header, index) => {
      // Map various common column names
      if (header.includes('target') || header.includes('chinese') || header.includes('hanzi') || header.includes('character') || header.includes('arabic')) {
        columnMap['target'] = index;
      } else if (header.includes('pronunciation') || header.includes('pinyin') || header.includes('reading')) {
        columnMap['pronunciation'] = index;
      } else if (header.includes('english') || header.includes('meaning') || header.includes('definition') || header.includes('translation')) {
        columnMap['english'] = index;
      } else if (header.includes('category') || header.includes('tag') || header.includes('type') || header.includes('deck')) {
        columnMap['category'] = index;
      } else if (header === 'front') {
        columnMap['target'] = index;
      } else if (header === 'back') {
        columnMap['english'] = index;
      }
    });
  }

  // If no header or incomplete mapping, assume column order: target, pronunciation, english, [category]
  if (!hasHeader || Object.keys(columnMap).length < 2) {
    columnMap = { target: 0, pronunciation: 1, english: 2, category: 3 };
  }

  // Process data rows
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCSVLine(line);

    const target = columns[columnMap['target']]?.trim() || '';
    const pronunciation = columns[columnMap['pronunciation']]?.trim() || '';
    const english = columns[columnMap['english']]?.trim() || '';
    const category = columns[columnMap['category']]?.trim() || 'custom';

    if (!target && !english) {
      errors.push(`Line ${i + 1}: Missing both target and English`);
      continue;
    }

    if (!target) {
      errors.push(`Line ${i + 1}: Missing target characters`);
      continue;
    }

    if (!english) {
      errors.push(`Line ${i + 1}: Missing English translation`);
      continue;
    }

    words.push({
      target,
      pronunciation: pronunciation || '',
      english,
      category,
    });
  }

  return { words, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function saveCustomDeck(words: Word[]): void {
  localStorage.setItem('wordrunner_custom_deck', JSON.stringify(words));
}

export function loadCustomDeck(): Word[] | null {
  const stored = localStorage.getItem('wordrunner_custom_deck');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearCustomDeck(): void {
  localStorage.removeItem('wordrunner_custom_deck');
}

export function hasCustomDeck(): boolean {
  return localStorage.getItem('wordrunner_custom_deck') !== null;
}
