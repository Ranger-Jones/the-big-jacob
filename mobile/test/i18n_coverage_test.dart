import 'dart:io';

import 'package:der_grosse_jakob/i18n/i18n.dart';
import 'package:flutter_test/flutter_test.dart';

/// Every literal text the app passes to t() must have an English entry (in the web's dictionary,
/// src/lib/i18n/en – app-only texts in en/mobile.ts – then run tool/sync_i18n.sh).
void main() {
  test('every t() text has an English translation', () {
    final missing = <String>{};
    final files = Directory('lib').listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('.dart') && !f.path.endsWith('.g.dart'));
    final call = RegExp(r"""\bt\(\s*'((?:[^'\\]|\\.)+)'""");
    for (final file in files) {
      for (final m in call.allMatches(file.readAsStringSync())) {
        final key = m[1]!.replaceAll(r"\'", "'").replaceAll(r'\$', r'$');
        if (key.contains(r'$')) continue; // interpolated Dart strings are checked where they are built
        if (RegExp('[A-Za-zÄÖÜäöüß]').hasMatch(key) && lookupEnglish(key) == null) missing.add('${file.path}: $key');
      }
    }
    expect(missing, isEmpty, reason: missing.join('\n'));
  });

  test('placeholders and finished sentences translate', () {
    I18n.language.value = 'en';
    expect(t('Sprache'), 'Language');
    expect(t('Unbekannter Text bleibt deutsch'), 'Unbekannter Text bleibt deutsch');
    I18n.language.value = 'de';
    expect(t('Sprache'), 'Sprache');
  });
}
