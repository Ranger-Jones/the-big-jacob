import { JESTER, playShape, type RandInt } from './jakob/cards';
import { applyAction, createGameState, type GameState } from './jakob/engine';
import { judgePlay, worstCards, type RuleContext } from './jakob/rules';
import { DEFAULT_SETTINGS, type Trick } from './jakob/types';

/** Lessons use the standard rules without events. */
export const LESSON_CTX: RuleContext = { settings: DEFAULT_SETTINGS, event: null, decks: 1 };

export type LessonKind = 'play' | 'pass' | 'tax' | 'quiz';
export interface QuizOption { label: string; correct: boolean; why: string }

export interface Lesson {
  id: string;
  title: string;
  /** What the rule is, in two or three sentences. */
  text: string;
  /** What to do now. */
  task: string;
  kind: LessonKind;
  hand: number[];
  /** Cards already on the table (null: you lead). */
  trick: number[] | null;
  taxCount?: number;
  quiz?: QuizOption[];
}

export type Verdict = { ok: true; message: string } | { ok: false; message: string };

export function lessonTrick(lesson: Pick<Lesson, 'trick'>): Trick | null {
  if (!lesson.trick) return null;
  const shape = playShape(lesson.trick)!;
  return { cards: lesson.trick, rank: shape.rank, count: shape.count, by: 'lehrer', seq: 0 };
}

export const LESSONS: Lesson[] = [
  {
    id: 'rang',
    title: 'Klein schlägt groß',
    text: 'Es gibt die Karten 1 bis 12. Die 1 ist der Große Jakob und die beste Karte, die 12 ist der Bauer und die schwächste. Von jeder Zahl gibt es so viele Karten, wie sie zählt: einen Jakob, aber zwölf Bauern.',
    task: 'Auf dem Tisch liegt eine 9. Leg eine einzelne Karte, die sie schlägt.',
    kind: 'play', hand: [12, 11, 10, 7, 3], trick: [9],
  },
  {
    id: 'anzahl',
    title: 'Gleiche Anzahl',
    text: 'Wer eröffnet, bestimmt, wie viele gleiche Karten gelegt werden. Alle anderen müssen genau so viele Karten legen, und zwar mit einer kleineren Zahl.',
    task: 'Zwei Achten liegen. Schlag sie mit einem passenden Paar.',
    kind: 'play', hand: [11, 11, 11, 6, 5, 5], trick: [8, 8],
  },
  {
    id: 'narr',
    title: 'Die Narren',
    text: 'Die zwei Narren (N) passen zu jeder Zahl und füllen eine Gruppe auf. Allein gespielt zählen sie als 13, also als schwächste Karte.',
    task: 'Drei Siebenen liegen. Mach mit einem Narren aus deinen Vieren einen Dreier.',
    kind: 'play', hand: [12, 4, 4, JESTER], trick: [7, 7, 7],
  },
  {
    id: 'eroeffnen',
    title: 'Eröffnen',
    text: 'Wenn alle gepasst haben, räumt der letzte Spieler den Stich ab und eröffnet neu. Dann darfst du jede Gruppe gleicher Karten legen. Am klügsten wirst du so viele schwache Karten auf einmal los wie möglich.',
    task: 'Du eröffnest. Werde deine schwächsten Karten auf einen Schlag los.',
    kind: 'play', hand: [2, 6, 12, 12, 12], trick: null,
  },
  {
    id: 'passen',
    title: 'Passen',
    text: 'Kannst oder willst du nicht legen, passt du. Wer passt, ist für den Rest dieses Stichs raus. Gegen die 1 kommt niemand an, der Stich ist sofort vorbei.',
    task: 'Jemand hat den Großen Jakob gelegt. Was tust du?',
    kind: 'pass', hand: [2, 3, 3, 9], trick: [1],
  },
  {
    id: 'steuern',
    title: 'Steuern',
    text: 'Vor jeder Runde wird nach Rang gesessen, in der ersten nach gezogenen Karten und danach nach eurer Platzierung. Der Große Knecht (Letzter) muss dem Großen Jakob (Erster) seine zwei besten Karten geben, und der Jakob gibt zwei Karten seiner Wahl zurück. Für den Kleinen Knecht und den Kleinen Jakob gilt dasselbe mit einer Karte.',
    task: 'Du bist Großer Jakob und hast gerade eine 1 und eine 2 bekommen. Gib zwei Karten zurück.',
    kind: 'tax', hand: [1, 2, 3, 5, 9, 11, 12], trick: null, taxCount: 2,
  },
  {
    id: 'revolution',
    title: 'Revolution',
    text: 'Wer nach dem Austeilen beide Narren hält, darf eine Revolution ausrufen: Dann fallen alle Steuern aus. Macht das ausgerechnet der Große Knecht, ist es eine Große Revolution, und die ganze Rangordnung dreht sich um.',
    task: 'Du bist Großer Knecht und hast beide Narren auf der Hand. Was ist die beste Wahl?',
    kind: 'quiz', hand: [JESTER, JESTER, 4, 8, 10, 12], trick: null,
    quiz: [
      { label: 'Große Revolution ausrufen', correct: true, why: 'Genau: Du wirst sofort Großer Jakob, der bisherige Jakob landet ganz unten, und niemand zahlt Steuern.' },
      { label: 'Steuern zahlen wie immer', correct: false, why: 'Dann gibst du deine zwei besten Karten ab und bleibst unten. Mit beiden Narren geht mehr.' },
      { label: 'Die Narren als Steuer abgeben', correct: false, why: 'Narren müssen standardmäßig gar nicht als Steuer gezahlt werden. Nutze sie lieber für die Revolution.' },
    ],
  },
];

/** Judges an answer to a lesson; play lessons accept every legal play that fits the task. */
export function checkLesson(lesson: Lesson, answer: { cards?: number[]; pass?: boolean; option?: number }): Verdict {
  const trick = lessonTrick(lesson);
  switch (lesson.kind) {
    case 'pass':
      return answer.pass
        ? { ok: true, message: 'Richtig. Die 1 ist unschlagbar, der Stich ist vorbei, und wer sie gelegt hat, eröffnet neu.' }
        : { ok: false, message: 'Gegen die 1 kannst du nichts legen. Passe einfach.' };
    case 'quiz': {
      const option = lesson.quiz?.[answer.option ?? -1];
      return option ? { ok: option.correct, message: option.why } : { ok: false, message: 'Wähle eine Antwort.' };
    }
    case 'tax': {
      const cards = answer.cards ?? [];
      if (cards.length !== lesson.taxCount) return { ok: false, message: `Wähle genau ${lesson.taxCount} Karten.` };
      const worst = worstCards(lesson.hand, lesson.taxCount!, LESSON_CTX).sort((a, b) => a - b);
      const same = [...cards].sort((a, b) => a - b).every((c, i) => c === worst[i]);
      return same
        ? { ok: true, message: 'Perfekt: Du gibst deine schwächsten Karten zurück und behältst die starken.' }
        : { ok: false, message: 'Das geht, aber es ist teuer. Gib lieber deine zwei schwächsten Karten zurück, also die mit den größten Zahlen.' };
    }
    case 'play': {
      if (answer.pass) return { ok: false, message: trick ? 'Du kannst hier schlagen, also tu es!' : 'Wer eröffnet, darf nicht passen.' };
      const cards = answer.cards ?? [];
      if (cards.length === 0) return { ok: false, message: 'Wähle zuerst Karten aus deiner Hand.' };
      const verdict = judgePlay(cards, trick, LESSON_CTX);
      if (!verdict.ok) return { ok: false, message: verdict.error };
      if (lesson.id === 'narr' && !cards.includes(JESTER)) return { ok: false, message: 'Nimm den Narren dazu, er ergänzt deine Vieren.' };
      if (lesson.id === 'eroeffnen' && !(cards.length === 3 && cards.every((c) => c === 12))) {
        return { ok: true, message: 'Erlaubt. Noch besser wäre es, alle drei Bauern (12) auf einmal loszuwerden.' };
      }
      return { ok: true, message: 'Richtig gelegt!' };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Practice game: runs entirely in the browser against three bots.

export const PRACTICE_ME = 'du';
export const practiceRand: RandInt = (max) => Math.floor(Math.random() * max);
export const ctxOf = (s: GameState): RuleContext => ({ settings: s.settings, event: s.event, decks: s.settings.doubleDeck ? 2 : 1 });

export function newPracticeGame(rand: RandInt = practiceRand): GameState {
  let state = createGameState(PRACTICE_ME, { ...DEFAULT_SETTINGS, rounds: 3, events: false, missions: false, chat: false });
  for (let i = 0; i < 3; i++) {
    const res = applyAction(state, PRACTICE_ME, { type: 'addBot', level: 'easy' }, rand);
    if (res.ok) state = res.state;
  }
  const started = applyAction(state, PRACTICE_ME, { type: 'start' }, rand);
  return started.ok ? started.state : state;
}
