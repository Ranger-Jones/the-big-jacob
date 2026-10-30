import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme.dart';
import 'i18n.dart';

/// Deutsch / English switch (profile and sign-in screen). The app redraws in the new language at once.
class LanguagePicker extends StatelessWidget {
  final bool compact;
  const LanguagePicker({super.key, this.compact = false});

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<String>(
        valueListenable: I18n.language,
        builder: (context, lang, _) {
          final options = {'de': compact ? 'DE' : 'Deutsch', 'en': compact ? 'EN' : 'English'};
          final picker = Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(color: C.surface, borderRadius: BorderRadius.circular(99), border: Border.all(color: C.line)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              for (final e in options.entries)
                GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    I18n.set(e.key);
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: EdgeInsets.symmetric(horizontal: compact ? 10 : 16, vertical: compact ? 5 : 8),
                    decoration: BoxDecoration(color: lang == e.key ? C.gold : Colors.transparent, borderRadius: BorderRadius.circular(99)),
                    child: Text(e.value, style: T.label(compact ? 12 : 14, color: lang == e.key ? C.onGold : C.inkSoft)),
                  ),
                ),
            ]),
          );
          if (compact) return picker;
          return Row(children: [
            const Icon(Icons.translate_rounded, color: C.inkSoft, size: 20),
            const SizedBox(width: 10),
            Expanded(child: Text(t('Sprache'), style: T.body(17, weight: FontWeight.w700))),
            picker,
          ]);
        },
      );
}
