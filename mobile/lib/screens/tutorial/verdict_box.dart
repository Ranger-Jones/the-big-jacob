import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/tutorial.dart';
import '../../i18n/i18n.dart';
import '../../theme.dart';

/// Feedback on an answer: green with a check when right, red when wrong.
/// [attempt] replays the animation even when the same message comes twice.
class VerdictBox extends StatelessWidget {
  final Verdict? verdict;
  final int attempt;
  const VerdictBox({super.key, required this.verdict, this.attempt = 0});

  @override
  Widget build(BuildContext context) {
    final v = verdict;
    return AnimatedSize(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      alignment: Alignment.topCenter,
      child: v == null ? const SizedBox(width: double.infinity) : _box(v),
    );
  }

  Widget _box(Verdict v) {
    final color = v.ok ? C.vert : C.wax;
    final text = v.ok ? const Color(0xFF9BE3B8) : const Color(0xFFFFB3B8);
    final box = Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: v.ok ? .2 : .16),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: color.withValues(alpha: .6)),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(v.ok ? Icons.check_circle_rounded : Icons.info_outline_rounded, size: 22, color: text),
          const SizedBox(width: 10),
          Expanded(child: Text(t(v.message), style: T.body(16, color: text, weight: FontWeight.w700, height: 1.3))),
        ]),
      ),
    );
    final anim = box
        .animate(key: ValueKey('v-$attempt'))
        .fadeIn(duration: 180.ms)
        .scaleXY(begin: .96, end: 1, duration: 260.ms, curve: Curves.easeOutBack);
    return v.ok ? anim : anim.shakeX(hz: 5, amount: 4, duration: 320.ms);
  }
}
