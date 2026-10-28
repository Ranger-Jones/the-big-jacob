// Port of src/lib/tutorial.ts (lessons and checkLesson): seven short lessons, each checked by the
// real rules. Texts are kept word for word with the web app.

import 'rules.dart';

/// Lessons use the standard rules without events.
const lessonCtx = RuleCtx();

enum LessonKind { play, pass, tax, quiz }

class QuizOption {
  final String label, why;
  final bool correct;
  const QuizOption(this.label, {required this.correct, required this.why});
}

class Lesson {
  final String id, title;

  /// What the rule is, in two or three sentences.
  final String text;

  /// What to do now.
  final String task;
  final LessonKind kind;
  final List<int> hand;

  /// Cards already on the table (null: you lead).
  final List<int>? trick;
  final int taxCount;
  final List<QuizOption> quiz;

  const Lesson({
    required this.id, required this.title, required this.text, required this.task, required this.kind,
    required this.hand, this.trick, this.taxCount = 0, this.quiz = const [],
  });
}

class Verdict {
  final bool ok;
  final String message;
  const Verdict.ok(this.message) : ok = true;
  const Verdict.fail(this.message) : ok = false;
}

TrickInfo? lessonTrick(Lesson lesson) {
  final cards = lesson.trick;
  if (cards == null) return null;
  final shape = playShape(cards)!;
  return TrickInfo(cards, shape.rank, shape.count, 'lehrer', 0);
}

/// Sort key for "best card first" (port of bestKey in src/lib/jakob/rules.ts).
int _bestKey(int card, RuleCtx ctx, bool jestersFirst) {
  if (card == jester) return jestersFirst ? -100 : 100;
  return ctx.reversed ? -card : card;
}

/// The [count] worst cards (jesters are kept as long as possible).
List<int> worstCards(List<int> hand, int count, RuleCtx ctx) {
  final naturals = hand.where((c) => c != jester).toList()..sort((x, y) => _bestKey(y, ctx, false) - _bestKey(x, ctx, false));
  final jesters = hand.where((c) => c == jester);
  return [...naturals, ...jesters].take(count).toList();
}

const lessons = <Lesson>[
  Lesson(
    id: 'rang',
    title: 'Klein schlägt groß',
    text: 'Es gibt die Karten 1 bis 12. Die 1 ist der Große Jakob und die beste Karte, die 12 ist der Bauer und die schwächste. Von jeder Zahl gibt es so viele Karten, wie sie zählt: einen Jakob, aber zwölf Bauern.',
    task: 'Auf dem Tisch liegt eine 9. Leg eine einzelne Karte, die sie schlägt.',
    kind: LessonKind.play, hand: [12, 11, 10, 7, 3], trick: [9],
  ),
  Lesson(
    id: 'anzahl',
    title: 'Gleiche Anzahl',
    text: 'Wer eröffnet, bestimmt, wie viele gleiche Karten gelegt werden. Alle anderen müssen genau so viele Karten legen, und zwar mit einer kleineren Zahl.',
    task: 'Zwei Achten liegen. Schlag sie mit einem passenden Paar.',
    kind: LessonKind.play, hand: [11, 11, 11, 6, 5, 5], trick: [8, 8],
  ),
  Lesson(
    id: 'narr',
    title: 'Die Narren',
    text: 'Die zwei Narren (N) passen zu jeder Zahl und füllen eine Gruppe auf. Allein gespielt zählen sie als 13, also als schwächste Karte.',
    task: 'Drei Siebenen liegen. Mach mit einem Narren aus deinen Vieren einen Dreier.',
    kind: LessonKind.play, hand: [12, 4, 4, jester], trick: [7, 7, 7],
  ),
  Lesson(
    id: 'eroeffnen',
    title: 'Eröffnen',
    text: 'Wenn alle gepasst haben, räumt der letzte Spieler den Stich ab und eröffnet neu. Dann darfst du jede Gruppe gleicher Karten legen. Am klügsten wirst du so viele schwache Karten auf einmal los wie möglich.',
    task: 'Du eröffnest. Werde deine schwächsten Karten auf einen Schlag los.',
    kind: LessonKind.play, hand: [2, 6, 12, 12, 12],
  ),
  Lesson(
    id: 'passen',
    title: 'Passen',
    text: 'Kannst oder willst du nicht legen, passt du. Wer passt, ist für den Rest dieses Stichs raus. Gegen die 1 kommt niemand an, der Stich ist sofort vorbei.',
    task: 'Jemand hat den Großen Jakob gelegt. Was tust du?',
    kind: LessonKind.pass, hand: [2, 3, 3, 9], trick: [1],
  ),
  Lesson(
    id: 'steuern',
    title: 'Steuern',
    text: 'Vor jeder Runde wird nach Rang gesessen, in der ersten nach gezogenen Karten und danach nach eurer Platzierung. Der Große Knecht (Letzter) muss dem Großen Jakob (Erster) seine zwei besten Karten geben, und der Jakob gibt zwei Karten seiner Wahl zurück. Für den Kleinen Knecht und den Kleinen Jakob gilt dasselbe mit einer Karte.',
    task: 'Du bist Großer Jakob und hast gerade eine 1 und eine 2 bekommen. Gib zwei Karten zurück.',
    kind: LessonKind.tax, hand: [1, 2, 3, 5, 9, 11, 12], taxCount: 2,
  ),
  Lesson(
    id: 'revolution',
    title: 'Revolution',
    text: 'Wer nach dem Austeilen beide Narren hält, darf eine Revolution ausrufen: Dann fallen alle Steuern aus. Macht das ausgerechnet der Große Knecht, ist es eine Große Revolution, und die ganze Rangordnung dreht sich um.',
    task: 'Du bist Großer Knecht und hast beide Narren auf der Hand. Was ist die beste Wahl?',
    kind: LessonKind.quiz, hand: [jester, jester, 4, 8, 10, 12],
    quiz: [
      QuizOption('Große Revolution ausrufen', correct: true, why: 'Genau: Du wirst sofort Großer Jakob, der bisherige Jakob landet ganz unten, und niemand zahlt Steuern.'),
      QuizOption('Steuern zahlen wie immer', correct: false, why: 'Dann gibst du deine zwei besten Karten ab und bleibst unten. Mit beiden Narren geht mehr.'),
      QuizOption('Die Narren als Steuer abgeben', correct: false, why: 'Narren müssen standardmäßig gar nicht als Steuer gezahlt werden. Nutze sie lieber für die Revolution.'),
    ],
  ),
];

/// Judges an answer to a lesson; play lessons accept every legal play that fits the task.
Verdict checkLesson(Lesson lesson, {List<int>? cards, bool pass = false, int? option}) {
  final trick = lessonTrick(lesson);
  switch (lesson.kind) {
    case LessonKind.pass:
      return pass
          ? const Verdict.ok('Richtig. Die 1 ist unschlagbar, der Stich ist vorbei, und wer sie gelegt hat, eröffnet neu.')
          : const Verdict.fail('Gegen die 1 kannst du nichts legen. Passe einfach.');
    case LessonKind.quiz:
      final i = option ?? -1;
      if (i < 0 || i >= lesson.quiz.length) return const Verdict.fail('Wähle eine Antwort.');
      final o = lesson.quiz[i];
      return o.correct ? Verdict.ok(o.why) : Verdict.fail(o.why);
    case LessonKind.tax:
      final given = cards ?? const <int>[];
      if (given.length != lesson.taxCount) return Verdict.fail('Wähle genau ${lesson.taxCount} Karten.');
      final worst = worstCards(lesson.hand, lesson.taxCount, lessonCtx)..sort();
      final sorted = [...given]..sort();
      var same = true;
      for (var i = 0; i < sorted.length; i++) {
        if (sorted[i] != worst[i]) same = false;
      }
      return same
          ? const Verdict.ok('Perfekt: Du gibst deine schwächsten Karten zurück und behältst die starken.')
          : const Verdict.fail('Das geht, aber es ist teuer. Gib lieber deine zwei schwächsten Karten zurück, also die mit den größten Zahlen.');
    case LessonKind.play:
      if (pass) return Verdict.fail(trick != null ? 'Du kannst hier schlagen, also tu es!' : 'Wer eröffnet, darf nicht passen.');
      final played = cards ?? const <int>[];
      if (played.isEmpty) return const Verdict.fail('Wähle zuerst Karten aus deiner Hand.');
      final error = judgePlay(played, trick, lessonCtx);
      if (error != null) return Verdict.fail(error);
      if (lesson.id == 'narr' && !played.contains(jester)) return const Verdict.fail('Nimm den Narren dazu, er ergänzt deine Vieren.');
      if (lesson.id == 'eroeffnen' && !(played.length == 3 && played.every((c) => c == 12))) {
        return const Verdict.ok('Erlaubt. Noch besser wäre es, alle drei Bauern (12) auf einmal loszuwerden.');
      }
      return const Verdict.ok('Richtig gelegt!');
  }
}
