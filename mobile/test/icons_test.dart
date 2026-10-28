import 'package:der_grosse_jakob/widgets/jakob_icons.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('stripEmoji removes leading emoji only', () {
    expect(stripEmoji('💣 Du zündest eine Bombe'), 'Du zündest eine Bombe');
    expect(stripEmoji('👑💥 Königssturz!'), 'Königssturz!');
    expect(stripEmoji('⏳ Du warst zu langsam'), 'Du warst zu langsam');
    expect(stripEmoji('🖐️ Stichsammler'), 'Stichsammler');
    expect(stripEmoji('Neuer Stich'), 'Neuer Stich');
  });

  test('every mapped icon exists', () {
    for (final name in [...eventIcons.values, ...missionIcons.values, ...badgeIcons.values, ...stageIcons.values, ...logIcons.values, ...teamIcons.values, 'qr', 'scan', 'globe', 'medal']) {
      expect(hasJakobIcon(name), isTrue, reason: name);
    }
  });
}
