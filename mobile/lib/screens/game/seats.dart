import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/controller.dart';
import '../../game/rules.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// Emoji for a rank title (index in the current order).
String titleEmoji(int index, int count) {
  if (index < 0) return '';
  if (index == 0) return '👑';
  if (index == count - 1) return '🧹';
  if (count >= 4 && index == 1) return '🎩';
  if (count >= 4 && index == count - 2) return '🧺';
  return '';
}

/// The other players in turn order, as a compact strip at the top of the table.
class SeatsStrip extends StatelessWidget {
  final GameController g;
  const SeatsStrip({super.key, required this.g});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final order = s.order.isNotEmpty ? s.order : s.players.map((p) => p.id).toList();
    // Start right after me so the strip reads in playing order.
    final mine = order.indexOf(g.me);
    final others = [
      for (var i = 1; i < order.length; i++) order[(math.max(mine, 0) + i) % order.length],
    ].where((id) => id != g.me).toList();
    final present = s.players.where((p) => !p.left).map((p) => p.id).toSet();
    return SizedBox(
      height: 104,
      child: LayoutBuilder(builder: (context, box) {
        final w = math.max(64.0, math.min(84.0, box.maxWidth / math.max(1, others.length)));
        return ListView(
          scrollDirection: Axis.horizontal,
          padding: EdgeInsets.symmetric(horizontal: others.length * w < box.maxWidth ? (box.maxWidth - others.length * w) / 2 : 8),
          children: [
            for (final id in others)
              if (present.contains(id)) SizedBox(width: w, child: Seat(g: g, id: id, order: order)),
          ],
        );
      }),
    );
  }
}

class Seat extends StatelessWidget {
  final GameController g;
  final String id;
  final List<String> order;
  final bool compact;
  const Seat({super.key, required this.g, required this.id, required this.order, this.compact = false});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final p = s.player(id);
    final turn = s.turn == id && s.phase == 'play';
    final passed = s.phase == 'play' && s.passed.contains(id);
    final out = s.finished.contains(id);
    final idx = s.order.indexOf(id);
    final emoji = titleEmoji(idx, s.order.length);
    final count = s.handCounts[id] ?? 0;
    final offline = p?.bot == null && !g.online.contains(id);
    final team = s.teams?[id];
    final reactions = g.emojis.where((e) => e.from == id).toList();

    final avatar = Avatar(
      name: g.nameOf(id),
      url: g.profiles[id]?.avatarUrl,
      emoji: p?.bot?.emoji,
      size: 48,
      ring: turn ? C.gold : team == null ? null : (team == 0 ? C.azure : C.wax),
    );

    return Opacity(
      opacity: passed || out ? .45 : 1,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Stack(clipBehavior: Clip.none, alignment: Alignment.center, children: [
          if (turn)
            Container(width: 60, height: 60, decoration: BoxDecoration(shape: BoxShape.circle, boxShadow: [BoxShadow(color: C.gold.withValues(alpha: .55), blurRadius: 18)]))
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .scaleXY(begin: .9, end: 1.08, duration: 900.ms),
          if (turn && s.deadline != null) _TurnRing(g: g),
          avatar,
          if (emoji.isNotEmpty) Positioned(top: -10, right: -4, child: Text(emoji, style: const TextStyle(fontSize: 18))),
          if (offline) Positioned(bottom: 0, left: 0, child: Container(width: 12, height: 12, decoration: BoxDecoration(color: C.inkMute, shape: BoxShape.circle, border: Border.all(color: C.night, width: 2)))),
          if (p?.autopilot == true) const Positioned(bottom: -4, left: -6, child: Text('🤖', style: TextStyle(fontSize: 16))),
          for (final r in reactions)
            Positioned(
              top: -26,
              child: Text(r.emoji, style: const TextStyle(fontSize: 30))
                  .animate(key: ValueKey(r.id))
                  .scaleXY(begin: .2, end: 1.2, duration: 300.ms, curve: Curves.easeOutBack)
                  .moveY(begin: 0, end: -26, duration: 2200.ms)
                  .fadeOut(delay: 1500.ms, duration: 700.ms),
            ),
        ]),
        const SizedBox(height: 5),
        Text(g.nameOf(id), maxLines: 1, overflow: TextOverflow.ellipsis, style: T.label(13, color: turn ? C.goldSoft : C.ink)),
        const SizedBox(height: 2),
        if (s.status == 'playing' && s.phase != 'draw')
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            child: Row(
              key: ValueKey('$count-$out-$passed'),
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!out && !passed) ...[const Icon(Icons.style_rounded, size: 13, color: C.inkSoft), const SizedBox(width: 3)],
                Text(out ? '✓ fertig' : passed ? 'passt' : '$count', style: T.label(12, color: out ? C.vert : C.inkSoft)),
              ],
            ),
          ),
      ]),
    );
  }
}

/// Countdown ring around the player on turn when a turn time is set.
class _TurnRing extends StatelessWidget {
  final GameController g;
  const _TurnRing({required this.g});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final deadline = DateTime.tryParse(s.deadline ?? '');
    final since = DateTime.tryParse(s.raw['waitSince'] as String? ?? '');
    if (deadline == null) return const SizedBox();
    final total = since != null ? deadline.difference(since).inMilliseconds : 30000;
    final left = deadline.difference(g.serverNow).inMilliseconds;
    final start = total <= 0 ? 0.0 : (left / total).clamp(0.0, 1.0);
    return TweenAnimationBuilder<double>(
      key: ValueKey(s.deadline),
      tween: Tween(begin: start, end: 0),
      duration: Duration(milliseconds: math.max(0, left)),
      builder: (_, v, _) => SizedBox(
        width: 58, height: 58,
        child: CircularProgressIndicator(value: v, strokeWidth: 3, color: v < .25 ? C.wax : C.gold, backgroundColor: Colors.white10),
      ),
    );
  }
}

/// Short summary of who is waiting on what, shown under the table.
String statusLine(GameController g) {
  final s = g.state!;
  switch (s.phase) {
    case 'draw':
      return s.draws.containsKey(g.me) ? 'Warte, bis alle gezogen haben …' : 'Zieh eine Karte um deinen Platz';
    case 'court':
      return 'Hofzeremonie: Bereit für die Steuern?';
    case 'tax':
      final mine = s.tax.where((t) => t.to == g.me && !t.done).firstOrNull;
      if (mine != null) return 'Gib ${mine.count} ${mine.count == 1 ? 'Karte' : 'Karten'} zurück';
      return 'Die Steuern werden gezahlt …';
    case 'play':
      if (s.turn == g.me) {
        final t = s.trick;
        return t == null ? 'Du spielst aus' : 'Du bist dran: schlag ${describeCards(t.cards)} oder passe';
      }
      return s.turn == null ? '…' : '${g.nameOf(s.turn!)} ist dran';
    case 'roundEnd':
      return 'Runde ${s.round} ist vorbei';
  }
  return '';
}
