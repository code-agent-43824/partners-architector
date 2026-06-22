import type { PrismaClient } from '@prisma/client';

import { QUESTION_SET_VERSION, QUESTIONS } from './questions';

export interface SeedResult {
  questions: number;
  settingsCreated: boolean;
}

/**
 * Idempotent seed: upserts the methodology question set and ensures a single
 * instance-settings row exists. Safe to run repeatedly (keyed by
 * question_set_version + number).
 */
export async function seed(prisma: PrismaClient): Promise<SeedResult> {
  for (const question of QUESTIONS) {
    const data = {
      title: question.title,
      prompt: question.prompt,
      helperQuestions: question.helperQuestions,
      category: question.category,
      isSensitive: question.isSensitive,
      orderIndex: question.number,
    };
    await prisma.question.upsert({
      where: {
        questionSetVersion_number: {
          questionSetVersion: QUESTION_SET_VERSION,
          number: question.number,
        },
      },
      update: data,
      create: { ...data, number: question.number, questionSetVersion: QUESTION_SET_VERSION },
    });
  }

  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({ data: { locale: 'ru', aiEnabled: false } });
  }

  return { questions: QUESTIONS.length, settingsCreated: !existingSettings };
}
