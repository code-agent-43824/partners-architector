import { describe, expect, it } from 'vitest';

import { QUESTION_SET_VERSION, QUESTIONS } from './questions';

// Heavy ("тяжёлый") blocks per spec Appendix A.
const HEAVY_BLOCKS = [5, 6, 9, 20, 21, 25, 26, 27, 28, 29];

describe('QUESTIONS seed data', () => {
  it('has 30 blocks numbered 1..30 in methodology order', () => {
    expect(QUESTIONS).toHaveLength(30);
    expect(QUESTIONS.map((q) => q.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('marks exactly the Appendix A heavy blocks as sensitive', () => {
    const heavy = QUESTIONS.filter((q) => q.isSensitive).map((q) => q.number);
    expect(heavy).toEqual(HEAVY_BLOCKS);
  });

  it('assigns the Appendix A contour categories at the boundaries', () => {
    const category = new Map(QUESTIONS.map((q) => [q.number, q.category]));
    expect(category.get(1)).toBe('Партнёрский контур');
    expect(category.get(4)).toBe('Фазность');
    expect(category.get(5)).toBe('Доли');
    expect(category.get(7)).toBe('Экономическая модель');
    expect(category.get(16)).toBe('Владельческий контур');
    expect(category.get(25)).toBe('Выход и переход прав');
    expect(category.get(30)).toBe('Легализация');
  });

  it('gives every block a title, prompt and at least one helper question', () => {
    for (const q of QUESTIONS) {
      expect(q.title.trim().length).toBeGreaterThan(0);
      expect(q.prompt.trim().length).toBeGreaterThan(0);
      expect(q.helperQuestions.length).toBeGreaterThan(0);
      expect(q.helperQuestions.every((h) => h.trim().length > 0)).toBe(true);
    }
  });

  it('declares a non-empty question-set version', () => {
    expect(QUESTION_SET_VERSION.length).toBeGreaterThan(0);
  });
});
