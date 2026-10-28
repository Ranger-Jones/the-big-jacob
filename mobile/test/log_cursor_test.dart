import 'package:der_grosse_jakob/game/log_cursor.dart';
import 'package:flutter_test/flutter_test.dart';

List<Map> logOf(Iterable<int> seqs, [String kind = 'play']) => [for (final q in seqs) {'seq': q, 'kind': kind}];

void main() {
  test('finds new entries even when the capped log keeps its length', () {
    final cursor = LogCursor();
    final full = logOf(List.generate(40, (i) => i + 1));
    cursor.skip(full);
    // One move later: the oldest entry drops out, a snap arrives – the length is still 40.
    final next = [...full.skip(1), {'seq': 41, 'kind': 'snap'}];
    expect(cursor.take(next).map((e) => e['kind']), ['snap']);
    expect(cursor.take(next), isEmpty);
  });

  test('keeps entries that share a move counter apart', () {
    final cursor = LogCursor();
    cursor.skip([{'seq': 5, 'kind': 'play'}]);
    final log = [{'seq': 5, 'kind': 'play'}, {'seq': 5, 'kind': 'snap'}, {'seq': 5, 'kind': 'clear'}];
    expect(cursor.take(log).map((e) => e['kind']), ['snap', 'clear']);
  });

  test('does not replay old moments when the table opens', () {
    final cursor = LogCursor()..skip(logOf([1, 2, 3], 'bomb'));
    expect(cursor.take(logOf([1, 2, 3], 'bomb')), isEmpty);
  });
}
