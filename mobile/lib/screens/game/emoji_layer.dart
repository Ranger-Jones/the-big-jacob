import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/controller.dart';
import '../../theme.dart';

/// Horizontal start position (8–92 % of the width) derived from the event id, like the web.
double _seededX(String id) {
  var h = 0;
  for (final c in id.codeUnits) {
    h = (h * 33 + c) & 0xFFFFFFFF;
  }
  return (8 + h % 84) / 100;
}

/// Reactions fly up across the whole table, mine included (same as the web's emoji layer).
class EmojiLayer extends StatelessWidget {
  final GameController g;
  const EmojiLayer({super.key, required this.g});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: LayoutBuilder(builder: (context, box) {
        return Stack(clipBehavior: Clip.none, children: [
          for (final e in g.emojis)
            Positioned(
              key: ValueKey(e.id),
              left: box.maxWidth * _seededX(e.id) - 40,
              bottom: 150,
              width: 80,
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(e.emoji, style: const TextStyle(fontSize: 48, shadows: [Shadow(color: Colors.black54, blurRadius: 8)])),
                const SizedBox(height: 2),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: C.velvet.withValues(alpha: .9), borderRadius: BorderRadius.circular(99)),
                  child: Text(g.nameOf(e.from, you: true), maxLines: 1, overflow: TextOverflow.ellipsis, style: T.label(11, color: C.ink)),
                ),
              ])
                  .animate()
                  .fadeIn(duration: 250.ms)
                  .scaleXY(begin: .6, end: 1.25, duration: 2400.ms, curve: Curves.easeOut)
                  .moveY(begin: 0, end: -420, duration: 2400.ms, curve: Curves.easeOut)
                  .shake(hz: 1.6, rotation: .14, duration: 2400.ms)
                  .fadeOut(delay: 1700.ms, duration: 600.ms),
            ),
        ]);
      }),
    );
  }
}
