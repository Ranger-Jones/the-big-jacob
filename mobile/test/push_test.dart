import 'package:der_grosse_jakob/push.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('notification links lead to the matching screen', () {
    expect(PushTarget.parse('/spiel/ab3cd9'), const GameTarget('AB3CD9'));
    expect(PushTarget.parse('https://the-big-jacob.vercel.app/spiel/XYZ234/'), const GameTarget('XYZ234'));
    expect(PushTarget.parse('/freunde'), isA<FriendsTarget>());
    expect(PushTarget.parse('/profil/hofnarr_1'), const ProfileTarget('hofnarr_1'));
    expect(PushTarget.parse('/'), isA<HomeTarget>());
    expect(PushTarget.parse('/spiel/../../etc'), isA<HomeTarget>());
    expect(PushTarget.parse('kaputt::'), isA<HomeTarget>());
  });
}
