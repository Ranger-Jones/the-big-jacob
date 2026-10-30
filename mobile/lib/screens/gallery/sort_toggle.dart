import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../i18n/i18n.dart';
import '../../theme.dart';

/// Two-way pill "Beliebt · Neu" with a gold thumb that glides between the halves.
class SortToggle extends StatelessWidget {
  /// Either 'beliebt' or 'neu' (the API's sort values).
  final String value;
  final ValueChanged<String> onChanged;
  const SortToggle({super.key, required this.value, required this.onChanged});

  static const _options = [('beliebt', 'Beliebt', Icons.local_fire_department_rounded), ('neu', 'Neu', Icons.auto_awesome_rounded)];

  @override
  Widget build(BuildContext context) {
    final index = value == 'neu' ? 1 : 0;
    return Container(
      width: 236,
      height: 52,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: C.velvet,
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: C.line),
      ),
      child: Stack(
        children: [
          AnimatedAlign(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            alignment: index == 0 ? Alignment.centerLeft : Alignment.centerRight,
            child: FractionallySizedBox(
              widthFactor: .5,
              heightFactor: 1,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [C.goldSoft, C.gold]),
                  borderRadius: BorderRadius.circular(99),
                  boxShadow: [BoxShadow(color: C.gold.withValues(alpha: .25), blurRadius: 12)],
                ),
              ),
            ),
          ),
          Material(
            type: MaterialType.transparency,
            child: Row(
              children: [
                for (var i = 0; i < _options.length; i++)
                  Expanded(
                    child: Semantics(
                      button: true,
                      selected: i == index,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(99),
                        onTap: i == index
                            ? null
                            : () {
                                HapticFeedback.selectionClick();
                                onChanged(_options[i].$1);
                              },
                        child: Center(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(_options[i].$3, size: 17, color: i == index ? C.onGold : C.inkSoft),
                              const SizedBox(width: 6),
                              AnimatedDefaultTextStyle(
                                duration: const Duration(milliseconds: 200),
                                style: T.label(15.5, color: i == index ? C.onGold : C.inkSoft),
                                child: Text(t(_options[i].$2)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
