'use client';
import { useState } from 'react';
import type { DeckEntry } from '@/lib/decks';
import { Lessons } from './lessons';
import { Practice } from './practice';

export function Tutorial({ deck, startWithPractice }: { deck: DeckEntry; startWithPractice: boolean }) {
  const [practice, setPractice] = useState(startWithPractice);
  return practice
    ? <Practice deck={deck} onExit={() => setPractice(false)} />
    : <Lessons deck={deck} onDone={() => setPractice(true)} />;
}
