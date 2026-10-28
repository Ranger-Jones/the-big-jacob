import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/controller.dart';
import '../../game/rules.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/playing_card.dart';
import 'seats.dart';
import '../../widgets/jakob_icons.dart';

/// The felt with its wooden rim; the trick lands in the middle.
class FeltTable extends StatelessWidget {
  final Widget child;
  const FeltTable({super.key, required this.child});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(140),
          gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF8A5A2E), C.wood, Color(0xFF3E2512)]),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .55), blurRadius: 30, offset: const Offset(0, 14))],
        ),
        padding: const EdgeInsets.all(9),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(132),
            gradient: const RadialGradient(center: Alignment(0, -.2), radius: 1, colors: [Color(0xFF2B7550), C.felt, C.feltDeep], stops: [0, .55, 1]),
            border: Border.all(color: C.gold.withValues(alpha: .35), width: 1.2),
          ),
          child: ClipRRect(borderRadius: BorderRadius.circular(132), child: child),
        ),
      );
}

/// The current trick; a new set flies in from the player who laid it.
class TrickView extends StatelessWidget {
  final GameController g;
  const TrickView({super.key, required this.g});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final trick = s.trick;
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 420),
      switchInCurve: Curves.easeOutBack,
      switchOutCurve: Curves.easeIn,
      transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: ScaleTransition(scale: Tween(begin: .85, end: 1.0).animate(anim), child: child)),
      child: trick == null
          ? Column(key: const ValueKey('empty'), mainAxisSize: MainAxisSize.min, children: [
              Text(s.turn == null ? '' : s.turn == g.me ? 'Du spielst aus' : '${g.nameOf(s.turn!)} spielt aus',
                  style: T.display(26, color: C.ink.withValues(alpha: .75))),
            ])
          : _Trick(key: ValueKey('t-${trick.seq}-${trick.by}'), g: g, trick: trick),
    );
  }
}

class _Trick extends StatelessWidget {
  final GameController g;
  final TrickInfo trick;
  const _Trick({super.key, required this.g, required this.trick});

  @override
  Widget build(BuildContext context) {
    final deck = g.deckOf(trick.by) ?? g.deckOf(g.me);
    final n = trick.cards.length;
    final w = n > 6 ? 54.0 : n > 3 ? 62.0 : 74.0;
    final overlap = n > 6 ? w * .55 : w * .42;
    final fromMe = trick.by == g.me;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      SizedBox(
        height: w * 1.4 + 16,
        width: w + overlap * (n - 1) + 24,
        child: Stack(alignment: Alignment.center, children: [
          for (var i = 0; i < n; i++)
            Positioned(
              left: 12 + i * overlap,
              top: 8 + ((i - (n - 1) / 2).abs() * 2),
              child: Transform.rotate(
                angle: (i - (n - 1) / 2) * .09,
                child: deck == null ? CardBack(width: w) : PlayingCard(rank: trick.cards[i], deck: deck, width: w),
              )
                  .animate()
                  .moveY(begin: fromMe ? 240 : -200, end: 0, duration: 420.ms, delay: (i * 50).ms, curve: Curves.easeOutCubic)
                  .rotate(begin: fromMe ? .1 : -.1, end: 0, duration: 420.ms, delay: (i * 50).ms)
                  .fadeIn(duration: 160.ms, delay: (i * 50).ms),
            ),
        ]),
      ),
      const SizedBox(height: 8),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
        decoration: BoxDecoration(color: Colors.black.withValues(alpha: .3), borderRadius: BorderRadius.circular(99)),
        child: Text('von ${g.nameOf(trick.by, you: true)}', style: T.label(13, color: C.ink)),
      ),
    ]);
  }
}

/// Draw phase: every player draws one card; the lowest becomes Great Jakob.
class DrawPanel extends StatelessWidget {
  final GameController g;
  const DrawPanel({super.key, required this.g});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final draws = s.draws;
    final players = s.players.where((p) => !p.left).toList();
    return Column(mainAxisSize: MainAxisSize.min, children: [
      Text('Wer wird Großer Jakob?', style: T.display(24)),
      const SizedBox(height: 4),
      Text('Die kleinste Zahl sitzt ganz oben.', style: T.body(14, color: C.inkSoft)),
      const SizedBox(height: 14),
      Wrap(spacing: 10, runSpacing: 10, alignment: WrapAlignment.center, children: [
        for (final p in players)
          Column(mainAxisSize: MainAxisSize.min, children: [
            draws[p.id] != null
                ? PlayingCard(rank: draws[p.id]!, deck: g.deckOf(p.id) ?? g.deckOf(g.me)!, width: 44)
                    .animate()
                    .flipH(begin: -1, end: 0, duration: 450.ms)
                : CardBack(deck: g.deckOf(p.id), width: 44),
            const SizedBox(height: 4),
            SizedBox(width: 60, child: Text(g.nameOf(p.id, you: true), maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: T.label(12, color: C.ink))),
          ]),
      ]),
    ]);
  }
}

/// Court ceremony: the new order, the round's event and the special moves before taxes.
class CourtPanel extends StatelessWidget {
  final GameController g;
  const CourtPanel({super.key, required this.g});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final order = s.order;
    final event = s.event != null ? eventText[s.event] : null;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      Text('Runde ${s.round}', style: T.display(26)),
      if (s.revolution != null)
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            JIcon(s.revolution!['grand'] == true ? 'flame' : 'fist', size: 22, color: C.goldSoft),
            const SizedBox(width: 6),
            Text(s.revolution!['grand'] == true ? 'Große Revolution!' : 'Revolution – keine Steuern!', style: T.display(20, color: C.goldSoft)),
          ])
              .animate().scaleXY(begin: .6, end: 1, curve: Curves.easeOutBack, duration: 500.ms),
        ),
      if (event != null)
        Container(
          margin: const EdgeInsets.only(top: 10),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(color: Colors.black.withValues(alpha: .28), borderRadius: BorderRadius.circular(14)),
          child: Column(children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              JIcon(eventIcons[s.event] ?? 'sparkles', size: 18, color: C.goldSoft),
              const SizedBox(width: 6),
              Text(event.title, style: T.body(15, weight: FontWeight.w800, color: C.goldSoft)),
            ]),
            const SizedBox(height: 2),
            Text(event.text, textAlign: TextAlign.center, style: T.body(14)),
          ]),
        ),
      const SizedBox(height: 10),
      for (var i = 0; i < order.length; i++)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Padding(padding: const EdgeInsets.only(right: 8), child: RankBadge(i, order.length, size: 20)),
            SizedBox(width: 120, child: Text(rankTitle(i, order.length), style: T.label(13, color: C.goldSoft))),
            SizedBox(width: 110, child: Text(g.nameOf(order[i], you: true), maxLines: 1, overflow: TextOverflow.ellipsis, style: T.body(15, weight: FontWeight.w700))),
            Icon(s.ready.contains(order[i]) ? Icons.check_circle_rounded : Icons.hourglass_empty_rounded, size: 16, color: s.ready.contains(order[i]) ? C.vert : C.inkMute),
          ]).animate().fadeIn(delay: (i * 80).ms).slideX(begin: -.1),
        ),
    ]);
  }
}

/// Taxes: who pays whom; the receiver picks cards to return below in the hand.
class TaxPanel extends StatelessWidget {
  final GameController g;
  const TaxPanel({super.key, required this.g});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      Text('Steuern', style: T.display(28)),
      const SizedBox(height: 10),
      if (s.tax.isEmpty) Text('Diese Runde zahlt niemand.', style: T.body(15, color: C.inkSoft)),
      for (final t in s.tax)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Text(g.nameOf(t.from, you: true), style: T.body(15, weight: FontWeight.w700)),
            Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Text('→ ${t.count} →', style: T.label(13, color: C.goldSoft))),
            Text(g.nameOf(t.to, you: true), style: T.body(15, weight: FontWeight.w700)),
            const SizedBox(width: 8),
            Icon(t.done ? Icons.check_circle_rounded : Icons.hourglass_top_rounded, size: 16, color: t.done ? C.vert : C.inkMute),
          ]),
        ),
      if (g.hand.received.isNotEmpty) ...[
        const SizedBox(height: 10),
        Text('Du hast ${describeCards(g.hand.received)} bekommen', style: T.body(14, color: C.goldSoft)),
      ],
      if (g.hand.gave.isNotEmpty) Text('Du hast ${describeCards(g.hand.gave)} abgegeben', style: T.body(14, color: C.inkSoft)),
    ]);
  }
}

/// End of a round: finishing order with the points it brought.
class RoundEndPanel extends StatelessWidget {
  final GameController g;
  const RoundEndPanel({super.key, required this.g});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final last = s.history.isNotEmpty ? s.history.last : null;
    final finish = last?.finish ?? const <String>[];
    return Column(mainAxisSize: MainAxisSize.min, children: [
      Text('Runde ${s.round} vorbei', style: T.display(26)),
      const SizedBox(height: 10),
      for (var i = 0; i < finish.length; i++)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            SizedBox(width: 30, child: i == 0 ? const JIcon('crown', size: 22, color: C.gold) : Text('${i + 1}.', style: T.display(18, color: C.inkSoft))),
            SizedBox(width: 120, child: Text(g.nameOf(finish[i], you: true), maxLines: 1, overflow: TextOverflow.ellipsis, style: T.body(16, weight: FontWeight.w700))),
            SizedBox(width: 44, child: Text('+${last!.points[finish[i]] ?? 0}', textAlign: TextAlign.right, style: T.label(14, color: C.vert))),
            SizedBox(width: 50, child: Text('${s.points[finish[i]] ?? 0}', textAlign: TextAlign.right, style: T.display(18))),
            const SizedBox(width: 6),
            Icon(s.ready.contains(finish[i]) ? Icons.check_circle_rounded : Icons.hourglass_empty_rounded, size: 16, color: s.ready.contains(finish[i]) ? C.vert : C.inkMute),
          ]).animate().fadeIn(delay: (i * 90).ms).slideY(begin: .2),
        ),
    ]);
  }
}

/// Big animated words for the dramatic moments (Schnapp, Bombe, Unschlagbar, Revolution, …).
class Burst extends StatelessWidget {
  final String kind;
  final String who;
  const Burst({super.key, required this.kind, required this.who});

  static const kinds = {'snap', 'bomb', 'unbeatable', 'revolution', 'grandRevolution', 'kingFall', 'throne', 'out'};

  @override
  Widget build(BuildContext context) {
    final (icon, word, color) = switch (kind) {
      'snap' => ('bolt', 'Schnapp!', C.goldSoft),
      'bomb' => ('bomb', 'Bombe!', C.wax),
      'unbeatable' => ('crown', 'Unschlagbar!', C.goldSoft),
      'revolution' => ('fist', 'Revolution!', C.wax),
      'grandRevolution' => ('flame', 'Große Revolution!', C.wax),
      'kingFall' => ('crown', 'Königssturz!', C.wax),
      'throne' => ('castle', 'Thronfolge!', C.goldSoft),
      _ => ('sparkles', '$who ist raus!', C.vert),
    };
    return IgnorePointer(
      child: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 104, height: 104, alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const RadialGradient(colors: [C.surfaceHi, C.velvet]),
              border: Border.all(color: color, width: 3),
              boxShadow: [BoxShadow(color: color.withValues(alpha: .55), blurRadius: 34, spreadRadius: 4)],
            ),
            child: JIcon(icon, size: 62, color: color),
          )
              .animate()
              .scaleXY(begin: .2, end: 1.15, duration: 380.ms, curve: Curves.easeOutBack)
              .then()
              .shake(hz: 4, duration: 400.ms),
          Text(word, textAlign: TextAlign.center, style: T.display(44, color: color).copyWith(shadows: [Shadow(color: Colors.black.withValues(alpha: .7), blurRadius: 16)]))
              .animate()
              .scaleXY(begin: 1.8, end: 1, duration: 420.ms, curve: Curves.easeOutCubic)
              .fadeIn(duration: 200.ms),
          if (kind != 'out' && who.isNotEmpty) Text(who, style: T.body(18, weight: FontWeight.w700)),
        ]),
      ).animate().fadeOut(delay: 1500.ms, duration: 400.ms),
    );
  }
}

/// A single colour-safe sparkle field for celebrations (kept light so it stays smooth on phones).
class Sparkles extends StatelessWidget {
  const Sparkles({super.key});

  @override
  Widget build(BuildContext context) {
    final rand = math.Random(7);
    return IgnorePointer(
      child: Stack(children: [
        for (var i = 0; i < 18; i++)
          Align(
            alignment: Alignment(rand.nextDouble() * 2 - 1, rand.nextDouble() * 2 - 1),
            child: const Icon(Icons.star_rounded, color: C.goldSoft, size: 14)
                .animate(onPlay: (c) => c.repeat(reverse: true), delay: (rand.nextInt(900)).ms)
                .fadeIn(duration: 600.ms)
                .scaleXY(begin: .4, end: 1.1, duration: 900.ms),
          ),
      ]),
    );
  }
}

/// Banner while a bot plays for me (after I dropped out).
class AutopilotBanner extends StatelessWidget {
  final GameController g;
  const AutopilotBanner({super.key, required this.g});

  @override
  Widget build(BuildContext context) => Panel(
        glow: true,
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          const JIcon('bot', size: 28, color: C.goldSoft),
          const SizedBox(width: 12),
          Expanded(child: Text('Ein Bot spielt gerade für dich.', style: T.body(15))),
          GoldButton(label: 'Zurück ins Spiel', expand: false, onPressed: () => g.dispatch({'type': 'resume'})),
        ]),
      );
}
