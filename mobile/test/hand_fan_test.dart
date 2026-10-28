import 'package:der_grosse_jakob/game/models.dart';
import 'package:der_grosse_jakob/game/rules.dart';
import 'package:der_grosse_jakob/screens/game/hand_fan.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// A deck without network art, so the test needs no server.
final deck = Deck('t', 'Test', '#6b1e2e', '#f4b73a', '#fbf0d9', '#2b1a12', 'gotisch', 'medaillon',
    [for (var i = 0; i < 13; i++) CardFace('K', '🃏', null, null)], {});

void main() {
  testWidgets('tapping a visible card selects exactly that rank', (tester) async {
    tester.view.physicalSize = const Size(402 * 3, 874 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final hand = [1, 3, 3, 4, 4, 5, 7, 7, 9, 9, 10, 10, 11, 11, 11, 11, 11, 11, 12, 12, 12];
    Selection? last;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Align(
          alignment: Alignment.bottomCenter,
          child: StatefulBuilder(builder: (context, set) {
            return HandFan(
              cards: hand, deck: deck, selection: last ?? {}, mode: HandMode.play,
              onChanged: (s) => set(() => last = s),
            );
          }),
        ),
      ),
    ));
    await tester.pumpAndSettle();
    final ranks = countBy(hand).keys.toList()..sort();
    for (final rank in ranks) {
      if (last != null) {
        // Deselect by tapping the same stack again until it is empty.
        final prev = last!.keys.first;
        while ((last?[prev] ?? 0) > 0) {
          final r = tester.getRect(find.byKey(ValueKey('$prev')));
          await tester.tapAt(Offset(r.left + 12, r.top + r.height * .35));
          await tester.pumpAndSettle();
        }
      }
      // Tap the left edge of each stack: the part not covered by the next card.
      final card = find.byKey(ValueKey('$rank'));
      final box = tester.getRect(card);
      await tester.tapAt(Offset(box.left + 12, box.top + box.height * .35));
      await tester.pumpAndSettle();
      expect(last?.keys.toList(), [rank], reason: 'tap on $rank');
    }
  });
}
