import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/models.dart';
import '../../theme.dart';
import '../../widgets/playing_card.dart';

/// A small felt table for a lesson: the trick to beat, or a note that you lead.
/// Cards in [laid] fly up from the hand below and land on top of the beaten trick;
/// [cleared] sweeps the trick away (after a pass).
class LessonTable extends StatelessWidget {
  final Deck deck;
  final List<int>? trick;
  final List<int> laid;
  final bool cleared;
  const LessonTable({super.key, required this.deck, required this.trick, this.laid = const [], this.cleared = false});

  static const _cardW = 56.0;
  static const _ease = Duration(milliseconds: 380);

  @override
  Widget build(BuildContext context) {
    final trick = this.trick;
    final hasLaid = laid.isNotEmpty;
    return _Felt(
      child: SizedBox(
        height: 132,
        width: double.infinity,
        child: Stack(alignment: Alignment.center, clipBehavior: Clip.none, children: [
          if (trick == null && !hasLaid)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text('Der Tisch ist leer, du eröffnest.', textAlign: TextAlign.center, style: T.display(24, color: C.ink.withValues(alpha: .8))),
            ).animate().fadeIn(duration: 300.ms),
          if (trick != null)
            AnimatedSlide(
              duration: _ease,
              curve: Curves.easeOutCubic,
              offset: hasLaid ? const Offset(0, -.14) : cleared ? const Offset(0, -.4) : Offset.zero,
              child: AnimatedScale(
                duration: _ease,
                curve: Curves.easeOutCubic,
                scale: hasLaid ? .84 : cleared ? .7 : 1,
                child: AnimatedOpacity(
                  duration: _ease,
                  opacity: cleared ? 0 : hasLaid ? .45 : 1,
                  child: _Fan(cards: trick, deck: deck, width: _cardW),
                ),
              ),
            ).animate().fadeIn(duration: 260.ms).scaleXY(begin: .9, end: 1, duration: 320.ms, curve: Curves.easeOutBack),
          if (cleared)
            Text('Der Stich ist vorbei.', style: T.display(24, color: C.ink.withValues(alpha: .8)))
                .animate()
                .fadeIn(delay: 220.ms, duration: 300.ms)
                .slideY(begin: .3, end: 0, delay: 220.ms, duration: 300.ms),
          if (hasLaid)
            _Fan(key: ValueKey('laid-${laid.join(',')}'), cards: laid, deck: deck, width: _cardW, fly: true),
        ]),
      ),
    );
  }
}

/// The felt look of the game table (see FeltTable) at lesson size, without clipping so
/// cards can fly in over the rim.
class _Felt extends StatelessWidget {
  final Widget child;
  const _Felt({required this.child});

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(48),
          gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF8A5A2E), C.wood, Color(0xFF3E2512)]),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .5), blurRadius: 22, offset: const Offset(0, 10))],
        ),
        padding: const EdgeInsets.all(7),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(42),
            gradient: const RadialGradient(center: Alignment(0, -.2), radius: 1.2, colors: [Color(0xFF2B7550), C.felt, C.feltDeep], stops: [0, .55, 1]),
            border: Border.all(color: C.gold.withValues(alpha: .35), width: 1.2),
          ),
          child: child,
        ),
      );
}

/// A few cards fanned out like a trick on the table.
class _Fan extends StatelessWidget {
  final List<int> cards;
  final Deck deck;
  final double width;
  final bool fly;
  const _Fan({super.key, required this.cards, required this.deck, required this.width, this.fly = false});

  @override
  Widget build(BuildContext context) {
    final n = cards.length;
    final overlap = width * .42;
    final mid = (n - 1) / 2;
    return SizedBox(
      width: width + overlap * (n - 1) + 16,
      height: width * 1.4 + 12,
      child: Stack(clipBehavior: Clip.none, children: [
        for (var i = 0; i < n; i++)
          Positioned(
            left: 8 + i * overlap,
            top: 6 + (i - mid).abs() * 2,
            child: _card(i, mid),
          ),
      ]),
    );
  }

  Widget _card(int i, double mid) {
    final card = Transform.rotate(angle: (i - mid) * .09, child: PlayingCard(rank: cards[i], deck: deck, width: width));
    if (!fly) return card;
    // Rises from the hand below, spins slightly and settles on the felt.
    final delay = (i * 60).ms;
    return card
        .animate()
        .fadeIn(duration: 120.ms, delay: delay)
        .moveY(begin: 170, end: 0, duration: 460.ms, delay: delay, curve: Curves.easeOutCubic)
        .rotate(begin: .08, end: 0, duration: 460.ms, delay: delay)
        .scaleXY(begin: 1.18, end: 1, duration: 460.ms, delay: delay, curve: Curves.easeOutCubic);
  }
}
