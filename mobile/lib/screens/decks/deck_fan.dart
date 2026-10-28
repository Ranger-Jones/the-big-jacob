import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/models.dart';
import '../../widgets/playing_card.dart';

/// A small hand of cards held like a fan: the back behind, a few faces in front.
class DeckFan extends StatelessWidget {
  final Deck deck;
  final double cardWidth;
  final List<int> ranks;
  final bool animate;
  const DeckFan({super.key, required this.deck, this.cardWidth = 56, this.ranks = const [13, 12, 5, 1], this.animate = true});

  @override
  Widget build(BuildContext context) {
    // Back first (rearmost), then the faces; the last rank lands on top.
    final count = ranks.length + 1;
    final mid = (count - 1) / 2;
    final spread = cardWidth * .36;
    final h = cardWidth * 1.4;
    return SizedBox(
      width: cardWidth + spread * (count - 1) + cardWidth * .5,
      height: h + cardWidth * .32,
      child: Stack(alignment: Alignment.bottomCenter, clipBehavior: Clip.none, children: [
        for (var i = 0; i < count; i++)
          _place(
            i,
            mid,
            spread,
            i == 0 ? CardBack(deck: deck, width: cardWidth) : PlayingCard(rank: ranks[i - 1], deck: deck, width: cardWidth),
          ),
      ]),
    );
  }

  Widget _place(int i, double mid, double spread, Widget card) {
    final d = i - mid;
    final placed = Transform.translate(
      offset: Offset(d * spread, d.abs() * cardWidth * .06),
      child: Transform.rotate(angle: d * .14, alignment: Alignment.bottomCenter, child: card),
    );
    if (!animate) return placed;
    return placed
        .animate(delay: (60 * i).ms)
        .fadeIn(duration: 300.ms)
        .rotate(begin: -d * .02, end: 0, alignment: Alignment.bottomCenter, duration: 500.ms, curve: Curves.easeOutBack);
  }
}
