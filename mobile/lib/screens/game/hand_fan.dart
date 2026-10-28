import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/models.dart';
import '../../game/rules.dart';
import '../../theme.dart';
import '../../widgets/playing_card.dart';

/// Selected count per rank.
typedef Selection = Map<int, int>;

List<int> selectedCards(Selection sel) => [for (final e in sel.entries) ...List.filled(e.value, e.key)];

enum HandMode { play, tax, view }

/// Same tap rules as the web hand: tapping a rank selects as many copies as the trick needs
/// (jesters top up), tapping again removes one; in tax mode cards are picked one by one.
Selection tapRank(Selection selection, int rank, int count, {required HandMode mode, TrickInfo? trick, int taxCount = 0}) {
  final cur = selection[rank] ?? 0;
  final next = Map<int, int>.from(selection);
  final total = selection.values.fold(0, (a, b) => a + b);
  if (mode == HandMode.tax) {
    next[rank] = cur < count && total < taxCount ? cur + 1 : 0;
    return next..removeWhere((_, v) => v == 0);
  }
  if (rank == jester) {
    next[rank] = cur >= count ? 0 : cur + 1;
    return next..removeWhere((_, v) => v == 0);
  }
  next.removeWhere((k, _) => k != jester && k != rank);
  if (cur == 0) {
    final jesters = next[jester] ?? 0;
    next[rank] = trick != null ? math.min(count, math.max(1, trick.count - jesters)) : count;
  } else {
    next[rank] = cur - 1;
  }
  return next..removeWhere((_, v) => v == 0);
}

/// Your hand as a gently curved fan of stacks (one per rank), sized to fit the screen width.
class HandFan extends StatelessWidget {
  final List<int> cards;
  final Deck deck;
  final Selection selection;
  final ValueChanged<Selection> onChanged;
  final HandMode mode;
  final TrickInfo? trick;
  final int taxCount;
  final Set<int>? playable;
  final List<int> received;
  final int dealKey;

  const HandFan({
    super.key, required this.cards, required this.deck, required this.selection, required this.onChanged,
    required this.mode, this.trick, this.taxCount = 0, this.playable, this.received = const [], this.dealKey = 0,
  });

  static double _cardWidth(double width) => math.min(70.0, width / 4.8);

  /// The fan always takes the same height for a given width, so the table above never jumps.
  static double heightFor(double width) => 26 + 18 + _cardWidth(width) * 1.4 + 28;

  @override
  Widget build(BuildContext context) {
    final groups = countBy(cards).entries.toList()..sort((a, b) => a.key.compareTo(b.key));
    return LayoutBuilder(builder: (context, box) {
      if (groups.isEmpty) {
        return SizedBox(
          height: heightFor(box.maxWidth),
          child: Center(child: Text('Keine Karten mehr – gut gemacht!', style: T.display(22, color: C.inkSoft))),
        );
      }
      final width = box.maxWidth;
      final n = groups.length;
      final cardW = _cardWidth(width);
      // Leave room at both ends for the tilt of the outer cards.
      final usable = width - 28;
      final step = n == 1 ? 0.0 : math.min(cardW + 8, (usable - cardW) / (n - 1));
      final total = cardW + step * (n - 1);
      final left0 = (width - total) / 2;
      final mid = (n - 1) / 2;
      final curve = n > 6 ? .45 : 1.0;
      final maxDrop = math.pow(mid, 2) * curve;
      final height = heightFor(width);
      assert(maxDrop <= 18.5);
      final receivedSet = received.toSet();
      return SizedBox(
        height: height,
        child: Stack(clipBehavior: Clip.none, children: [
          for (var i = 0; i < n; i++)
            _stack(
              key: ValueKey('${groups[i].key}'),
              rank: groups[i].key,
              count: groups[i].value,
              left: left0 + i * step,
              top: 26 + math.pow((i - mid).abs(), 2) * curve,
              angle: n == 1 ? 0 : (i - mid) * (n > 8 ? .03 : .045),
              cardW: cardW,
              index: i,
              marked: receivedSet.contains(groups[i].key),
            ),
        ]),
      );
    });
  }

  Widget _stack({required Key key, required int rank, required int count, required double left, required double top, required double angle, required double cardW, required int index, required bool marked}) {
    final sel = selection[rank] ?? 0;
    final dim = mode == HandMode.play && playable != null && !playable!.contains(rank) && sel == 0;
    final lift = sel > 0 ? -22.0 : 0.0;
    return AnimatedPositioned(
      key: key,
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      left: left,
      top: top + lift,
      child: GestureDetector(
        onTap: mode == HandMode.view
            ? null
            : () {
                HapticFeedback.selectionClick();
                onChanged(tapRank(selection, rank, count, mode: mode, trick: trick, taxCount: taxCount));
              },
        child: Transform.rotate(
          angle: angle,
          alignment: Alignment.bottomCenter,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Stack(clipBehavior: Clip.none, children: [
              // Paper edges behind the top card hint at the stack height.
              if (count > 2) Positioned(left: 4, top: -4, child: _edge(cardW)),
              if (count > 1) Positioned(left: 2, top: -2, child: _edge(cardW)),
              PlayingCard(rank: rank, deck: deck, width: cardW, selected: sel > 0, dimmed: dim, marked: marked),
              // The lifted card's counter sits above it, where no neighbour can cover it.
              if (sel > 0)
                Positioned(
                  top: -14, left: 0, right: 0,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                      decoration: BoxDecoration(color: C.gold, borderRadius: BorderRadius.circular(99), boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 6)]),
                      child: Text('$sel/$count', style: T.label(12, color: C.onGold)),
                    ),
                  ),
                ),
            ]),
            const SizedBox(height: 4),
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
              decoration: BoxDecoration(
                color: C.night.withValues(alpha: .85),
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: C.line),
              ),
              child: Text('×$count', style: T.label(12, color: C.ink)),
            ),
          ]),
        ),
      )
          // Positioned must stay the direct child of the Stack, so the deal animation sits inside it.
          .animate(key: ValueKey('deal-$dealKey-$rank'))
          .fadeIn(duration: 260.ms, delay: (index * 45).ms)
          .moveY(begin: -120, end: 0, duration: 520.ms, delay: (index * 45).ms, curve: Curves.easeOutBack)
          .rotate(begin: -.04, end: 0, duration: 520.ms, delay: (index * 45).ms),
    );
  }

  Widget _edge(double w) => Container(
        width: w, height: w * 1.4,
        decoration: BoxDecoration(
          color: hexColor(deck.paper, C.ink),
          borderRadius: BorderRadius.circular(w * .09),
          border: Border.all(color: Colors.black.withValues(alpha: .25)),
        ),
      );
}
