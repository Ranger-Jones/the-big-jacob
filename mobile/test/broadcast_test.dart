import 'package:der_grosse_jakob/game/controller.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reads broadcasts from the web (nested) and from older app builds (flat)', () {
    final web = {'type': 'broadcast', 'event': 'emoji', 'payload': {'id': 'a-1', 'emoji': '🔥', 'from': 'a'}};
    final oldApp = {'type': 'broadcast', 'event': 'emoji', 'id': 'b-1', 'emoji': '👑', 'from': 'b'};
    expect(broadcastBody(web)['from'], 'a');
    expect(broadcastBody(oldApp)['from'], 'b');
  });
}
