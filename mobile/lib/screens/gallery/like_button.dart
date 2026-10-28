import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../theme.dart';
import 'gallery_deck.dart';

/// Heart with like count. Toggles optimistically and pops when a like lands.
class LikeButton extends StatefulWidget {
  final GalleryDeck deck;
  const LikeButton({super.key, required this.deck});

  @override
  State<LikeButton> createState() => _LikeButtonState();
}

class _LikeButtonState extends State<LikeButton> {
  // Bumped on every tap that likes, so the pop replays only then (not on first build).
  int _pops = 0;

  void _tap() {
    if (widget.deck.liking) return;
    HapticFeedback.lightImpact();
    if (!widget.deck.like.value.liked) setState(() => _pops++);
    toggleLike(context, widget.deck);
  }

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<LikeState>(
    valueListenable: widget.deck.like,
    builder: (context, s, _) {
      final color = s.liked ? C.wax : C.inkSoft;
      Widget heart = Icon(s.liked ? Icons.favorite_rounded : Icons.favorite_border_rounded, size: 22, color: color);
      if (_pops > 0 && s.liked) {
        heart = heart
            .animate(key: ValueKey(_pops))
            .scaleXY(end: 1.35, duration: 130.ms, curve: Curves.easeOut)
            .then()
            .scaleXY(end: 1 / 1.35, duration: 260.ms, curve: Curves.easeOutBack);
      }
      return Semantics(
        button: true,
        toggled: s.liked,
        label: s.liked ? 'Gefällt mir nicht mehr' : 'Gefällt mir',
        value: '${s.likes}',
        excludeSemantics: true,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: _tap,
            borderRadius: BorderRadius.circular(99),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              constraints: const BoxConstraints(minHeight: 48, minWidth: 64),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: s.liked ? C.wax.withValues(alpha: .16) : C.surfaceHi,
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: s.liked ? C.wax.withValues(alpha: .55) : C.line),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  heart,
                  const SizedBox(width: 6),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    transitionBuilder: (child, a) => FadeTransition(
                      opacity: a,
                      child: SlideTransition(
                        position: Tween(begin: const Offset(0, .35), end: Offset.zero).animate(a),
                        child: child,
                      ),
                    ),
                    child: Text(
                      '${s.likes}',
                      key: ValueKey(s.likes),
                      style: T.label(15, color: s.liked ? C.ink : C.inkSoft).copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    },
  );
}
