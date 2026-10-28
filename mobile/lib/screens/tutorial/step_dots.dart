import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../game/tutorial.dart';
import '../../theme.dart';

/// Numbered lesson steps; tapping one jumps there. Each dot has a full 48 px touch target.
class StepDots extends StatelessWidget {
  final int current;
  final Set<int> solved;
  final ValueChanged<int> onTap;
  const StepDots({super.key, required this.current, required this.solved, required this.onTap});

  @override
  Widget build(BuildContext context) => Wrap(
        alignment: WrapAlignment.center,
        children: [
          for (var i = 0; i < lessons.length; i++) _dot(i),
        ],
      );

  Widget _dot(int i) {
    final active = i == current;
    final done = solved.contains(i);
    final bg = active ? C.gold : done ? C.gold.withValues(alpha: .28) : Colors.white.withValues(alpha: .08);
    final fg = active ? C.onGold : done ? C.goldSoft : C.inkSoft;
    return Semantics(
      key: ValueKey('step-$i'),
      button: true,
      selected: active,
      label: 'Lektion ${i + 1}: ${lessons[i].title}',
      excludeSemantics: true,
      child: InkResponse(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap(i);
        },
        radius: 26,
        child: SizedBox(
          width: 48, height: 48,
          child: Center(
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 240),
              curve: Curves.easeOutCubic,
              width: active ? 40 : 34, height: active ? 40 : 34,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: bg,
                border: Border.all(color: active ? C.goldSoft : done ? C.gold.withValues(alpha: .5) : C.line),
                boxShadow: active ? [BoxShadow(color: C.gold.withValues(alpha: .35), blurRadius: 14)] : null,
              ),
              alignment: Alignment.center,
              child: done && !active
                  ? const Icon(Icons.check_rounded, size: 18, color: C.goldSoft)
                  : Text('${i + 1}', style: T.body(active ? 18 : 16, color: fg, weight: FontWeight.w800)),
            ),
          ),
        ),
      ),
    );
  }
}
