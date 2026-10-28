import 'package:der_grosse_jakob/game/models.dart';
import 'package:der_grosse_jakob/game/rules.dart';
import 'package:der_grosse_jakob/game/tutorial.dart';
import 'package:der_grosse_jakob/screens/tutorial/default_deck.dart';
import 'package:der_grosse_jakob/screens/tutorial/lesson_flow.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Lesson lesson(String id) => lessons.firstWhere((l) => l.id == id);

/// A deck without network art, so the widget test needs no server.
final deck = Deck('t', 'Test', '#6b1e2e', '#f4b73a', '#fbf0d9', '#2b1a12', 'gotisch', 'medaillon',
    [for (var i = 0; i < 13; i++) CardFace('K', '🃏', null, null)], {});

void main() {
  group('tutorial lessons', () {
    test('there are seven lessons with unique ids', () {
      expect(lessons.map((l) => l.id), ['rang', 'anzahl', 'narr', 'eroeffnen', 'passen', 'steuern', 'revolution']);
    });

    test('every lesson can be solved with its own hand', () {
      final answers = <String, Verdict Function(Lesson)>{
        'rang': (l) => checkLesson(l, cards: [7]),
        'anzahl': (l) => checkLesson(l, cards: [5, 5]),
        'narr': (l) => checkLesson(l, cards: [4, 4, jester]),
        'eroeffnen': (l) => checkLesson(l, cards: [12, 12, 12]),
        'passen': (l) => checkLesson(l, pass: true),
        'steuern': (l) => checkLesson(l, cards: [11, 12]),
        'revolution': (l) => checkLesson(l, option: 0),
      };
      for (final l in lessons) {
        expect(answers[l.id]!(l).ok, isTrue, reason: l.id);
      }
    });

    test('the solving cards are really in each hand', () {
      final plays = {'rang': [7], 'anzahl': [5, 5], 'narr': [4, 4, jester], 'eroeffnen': [12, 12, 12], 'steuern': [11, 12]};
      plays.forEach((id, cards) {
        final hand = lesson(id).hand;
        expect(removeCards(hand, cards).length, hand.length - cards.length, reason: id);
      });
    });

    test('rejects wrong answers with an explanation', () {
      expect(checkLesson(lesson('rang'), cards: [10]).ok, isFalse);
      final anzahl = checkLesson(lesson('anzahl'), cards: [6]);
      expect(anzahl.ok, isFalse);
      expect(anzahl.message, contains('2 Karten'));
      expect(checkLesson(lesson('narr'), cards: [12, 12, 12]).ok, isFalse);
      expect(checkLesson(lesson('passen'), cards: [2]).ok, isFalse);
      expect(checkLesson(lesson('steuern'), cards: [1, 2]).ok, isFalse);
      expect(checkLesson(lesson('revolution'), option: 1).ok, isFalse);
    });

    test('lesson-specific hints', () {
      expect(checkLesson(lesson('rang'), pass: true).message, 'Du kannst hier schlagen, also tu es!');
      expect(checkLesson(lesson('eroeffnen'), pass: true).message, 'Wer eröffnet, darf nicht passen.');
      expect(checkLesson(lesson('rang'), cards: []).message, 'Wähle zuerst Karten aus deiner Hand.');
      // A legal four without the jester is still not what the jester lesson asks for.
      final noJester = checkLesson(lesson('narr'), cards: [4, 4]);
      expect(noJester.ok, isFalse);
      // Opening with something other than the three twelves is allowed but gets a tip.
      final single = checkLesson(lesson('eroeffnen'), cards: [6]);
      expect(single.ok, isTrue);
      expect(single.message, contains('drei Bauern'));
      expect(checkLesson(lesson('steuern'), cards: [12]).message, 'Wähle genau 2 Karten.');
      expect(checkLesson(lesson('revolution')).ok, isFalse);
    });

    test('lessonTrick builds the trick on the table', () {
      final t = lessonTrick(lesson('narr'))!;
      expect([t.rank, t.count], [7, 3]);
      expect(lessonTrick(lesson('eroeffnen')), isNull);
    });

    test('worstCards keeps jesters and gives the highest numbers', () {
      expect(worstCards([1, 2, 3, 5, 9, 11, 12], 2, lessonCtx)..sort(), [11, 12]);
      expect(worstCards([jester, 3, 12], 2, lessonCtx), [12, 3]);
      expect(worstCards([jester, 3], 2, lessonCtx), [3, jester]);
      expect(worstCards([3, 9], 1, const RuleCtx(event: 'reversed')), [3]);
    });

    test('play lessons dim exactly the cards that cannot beat the trick', () {
      expect(playableRanks(lesson('rang').hand, lessonTrick(lesson('rang')), lessonCtx), {7, 3});
      expect(playableRanks(lesson('narr').hand, lessonTrick(lesson('narr')), lessonCtx), {4, jester});
    });
  });

  group('default deck', () {
    Map deckJson(String id) => {'id': id, 'name': id, 'design': {}};

    test('uses the deck marked as default', () {
      final d = defaultDeckFrom({'presets': [deckJson('a'), deckJson('hofstaat')], 'mine': [deckJson('m')], 'defaultId': 'hofstaat'});
      expect(d?.id, 'hofstaat');
      expect(defaultDeckFrom({'presets': [deckJson('a')], 'mine': [deckJson('m')], 'defaultId': 'm'})?.id, 'm');
    });

    test('falls back to the first preset', () {
      expect(defaultDeckFrom({'presets': [deckJson('a'), deckJson('b')], 'mine': [], 'defaultId': 'x'})?.id, 'a');
      expect(defaultDeckFrom({'presets': [], 'mine': []}), isNull);
      expect(defaultDeckFrom(null), isNull);
    });
  });

  group('lesson flow', () {
    Future<void> tapText(WidgetTester tester, String text) async {
      await tester.ensureVisible(find.text(text));
      await tester.pumpAndSettle();
      await tester.tap(find.text(text));
      await tester.pumpAndSettle();
    }

    Future<void> tapStack(WidgetTester tester, int rank) async {
      await tester.ensureVisible(find.byKey(ValueKey('$rank')));
      await tester.pumpAndSettle();
      final r = tester.getRect(find.byKey(ValueKey('$rank')));
      await tester.tapAt(Offset(r.left + 12, r.top + r.height * .35));
      await tester.pumpAndSettle();
    }

    testWidgets('solves the first lesson, jumps around and reaches the finish', (tester) async {
      tester.view.physicalSize = const Size(375 * 3, 812 * 3);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      var campaign = 0;
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: LessonFlow(deck: deck, onCampaign: () => campaign++))));
      await tester.pumpAndSettle();

      expect(find.text('Klein schlägt groß'), findsOneWidget);
      // A wrong single card is rejected.
      await tapStack(tester, 10);
      await tapText(tester, 'Legen');
      expect(find.text('Du brauchst eine kleinere Zahl.'), findsOneWidget);
      expect(find.text('Nächste Lektion'), findsNothing);

      // Deselect the 10, play the 7: it leaves the hand.
      await tapStack(tester, 10);
      await tapStack(tester, 7);
      await tapText(tester, 'Legen');
      expect(find.text('Richtig gelegt!'), findsOneWidget);
      expect(find.byKey(const ValueKey('7')), findsNothing);

      await tapText(tester, 'Nächste Lektion');
      expect(find.text('Gleiche Anzahl'), findsOneWidget);

      // Every lesson renders without layout errors.
      for (var i = 0; i < lessons.length; i++) {
        await tester.ensureVisible(find.byKey(ValueKey('step-$i')));
        await tester.tap(find.byKey(ValueKey('step-$i')));
        await tester.pumpAndSettle();
        expect(find.text(lessons[i].title), findsWidgets);
        expect(tester.takeException(), isNull);
      }
      await tester.tap(find.byKey(const ValueKey('step-3')));
      await tester.pumpAndSettle();
      expect(find.text('Der Tisch ist leer, du eröffnest.'), findsOneWidget);

      // The last lesson: a wrong answer, then the right one, then the finish card.
      await tester.tap(find.byKey(const ValueKey('step-6')));
      await tester.pumpAndSettle();
      await tapText(tester, 'Steuern zahlen wie immer');
      expect(find.textContaining('Mit beiden Narren geht mehr'), findsOneWidget);
      await tapText(tester, 'Große Revolution ausrufen');
      await tapText(tester, 'Abschließen');
      expect(find.text('Geschafft!'), findsOneWidget);
      await tapText(tester, 'Zur Kampagne');
      expect(campaign, 1);
    });
  });
}
