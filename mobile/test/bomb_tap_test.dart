import 'package:der_grosse_jakob/game/rules.dart';
import 'package:der_grosse_jakob/screens/game/hand_fan.dart';
import 'package:flutter_test/flutter_test.dart';

TrickInfo trick(int rank, int count) => TrickInfo(List.filled(count, rank), rank, count, 'x', 1);

void main() {
  const bombs = RuleCtx(bomb: true);

  test('the second tap lays a stack of four or more as a bomb', () {
    var sel = tapRank({}, 5, 4, mode: HandMode.play, trick: trick(8, 1), ctx: bombs);
    expect(sel, {5: 1});
    sel = tapRank(sel, 5, 4, mode: HandMode.play, trick: trick(8, 1), ctx: bombs);
    expect(sel, {5: 4});
    expect(judgePlay([5, 5, 5, 5], trick(8, 1), bombs), isNull);
  });

  test('a rank that only beats as a bomb takes the whole stack at once', () {
    expect(tapRank({jester: 1}, 10, 5, mode: HandMode.play, trick: trick(3, 2), ctx: bombs), {10: 5});
  });

  test('without the rule the old behaviour stays', () {
    expect(tapRank({5: 1}, 5, 4, mode: HandMode.play, trick: trick(8, 1), ctx: const RuleCtx()), <int, int>{});
  });
}
