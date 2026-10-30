import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'en.g.dart';

/// Minimal i18n, the same as the website's (src/lib/i18n/core.ts): the German text *is* the key.
/// In German `t` returns it unchanged, in English it looks it up in the dictionary generated from
/// the web (tool/sync_i18n.sh) and falls back to German. Placeholders use braces:
/// `t('{name} ist dran', {'name': name})`.
class I18n {
  I18n._();

  static const languages = ['de', 'en'];
  static const _prefsKey = 'language';

  /// The current language; the app rebuilds when it changes.
  static final language = ValueNotifier<String>('de');

  static bool get english => language.value == 'en';

  /// Saved choice, or the phone's language the first time (German unless it is English).
  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefsKey);
    language.value = languages.contains(saved) ? saved! : (ui.PlatformDispatcher.instance.locale.languageCode == 'en' ? 'en' : 'de');
  }

  static Future<void> set(String lang) async {
    if (!languages.contains(lang) || lang == language.value) return;
    language.value = lang;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, lang);
  }
}

/// Translates a German UI text into the current language.
String t(String text, [Map<String, Object?>? vars]) => format(I18n.english ? (lookupEnglish(text) ?? text) : text, vars);

String format(String template, Map<String, Object?>? vars) {
  if (vars == null || vars.isEmpty) return template;
  return template.replaceAllMapped(RegExp(r'\{(\w+)\}'), (m) => vars.containsKey(m[1]) ? '${vars[m[1]]}' : m[0]!);
}

class _Pattern {
  final RegExp re;
  final List<String> names;
  final String en;
  final int literal;
  _Pattern(this.re, this.names, this.en, this.literal);
}

List<_Pattern>? _patterns;

/// Keys with placeholders also match finished German sentences, so texts built on the server
/// ("Der Tisch ist voll (8 Plätze).") translate via the key "Der Tisch ist voll ({n} Plätze).".
List<_Pattern> _patternList() => _patterns ??= (enDictionary.entries.where((e) => e.key.contains(RegExp(r'\{\w+\}'))).map((e) {
      final names = <String>[];
      final source = e.key.splitMapJoin(
        RegExp(r'\{(\w+)\}'),
        onMatch: (m) {
          names.add(m[1]!);
          return '(.+?)';
        },
        onNonMatch: RegExp.escape,
      );
      return _Pattern(RegExp('^$source\$'), names, e.value, e.key.replaceAll(RegExp(r'\{\w+\}'), '').length);
    }).toList()
      // Most specific first, so "Gib genau {n} Karten zurück." wins over "{count} Karten".
      ..sort((a, b) => b.literal.compareTo(a.literal)));

/// English for a German text, or null when the dictionary has none.
@visibleForTesting
String? lookupEnglish(String text) {
  final direct = enDictionary[text];
  if (direct != null) return direct;
  for (final p in _patternList()) {
    final m = p.re.firstMatch(text);
    if (m != null) return format(p.en, {for (var i = 0; i < p.names.length; i++) p.names[i]: m[i + 1]});
  }
  return null;
}
