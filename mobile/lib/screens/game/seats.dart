import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../api.dart';

import '../../game/controller.dart';
import '../../game/rules.dart';
import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/jakob_icons.dart';

/// Small round badge with the icon of a rank title (index in the current order).
class RankBadge extends StatelessWidget {
  final int index, count;
  final double size;
  const RankBadge(this.index, this.count, {super.key, this.size = 22});

  @override
  Widget build(BuildContext context) {
    if (index < 0) return SizedBox(width: size, height: size);
    final top = index == 0 || (count >= 4 && index == 1);
    return Container(
      width: size, height: size, alignment: Alignment.center,
      decoration: BoxDecoration(shape: BoxShape.circle, color: C.velvet, border: Border.all(color: top ? C.gold : C.line, width: 1.2)),
      child: JIcon(rankIcon(index, count), size: size * .68, color: top ? C.goldSoft : C.inkSoft),
    );
  }
}

/// The other players in turn order, as a compact strip at the top of the table.
class SeatsStrip extends StatelessWidget {
  final GameController g;
  const SeatsStrip({super.key, required this.g});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final order = s.order.isNotEmpty ? s.order : s.players.map((p) => p.id).toList();
    // Start right after me so the strip reads in playing order (spectators see everyone in order).
    final mine = order.indexOf(g.me);
    final others = mine < 0
        ? order
        : [for (var i = 1; i < order.length; i++) order[(mine + i) % order.length]];
    final present = s.players.where((p) => !p.left).map((p) => p.id).toSet();
    return SizedBox(
      height: 118,
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
    final count = s.handCounts[id] ?? 0;
    final offline = p?.bot == null && !g.online.contains(id);
    final team = s.teams?[id];

    final avatar = Avatar(
      name: p?.bot?.name ?? g.nameOf(id),
      url: g.profiles[id]?.avatarUrl,
      emoji: p?.bot?.emoji,
      size: 48,
      ring: turn ? C.gold : team == null ? null : (team == 0 ? C.azure : C.wax),
      frame: g.profiles[id]?.lootFrame,
    );

    return Opacity(
      opacity: passed || out ? .45 : 1,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        // Room above the avatar for the rank badge and flying reactions.
        const SizedBox(height: 12),
        Stack(clipBehavior: Clip.none, alignment: Alignment.center, children: [
          if (turn)
            Container(width: 60, height: 60, decoration: BoxDecoration(shape: BoxShape.circle, boxShadow: [BoxShadow(color: C.gold.withValues(alpha: .55), blurRadius: 18)]))
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .scaleXY(begin: .9, end: 1.08, duration: 900.ms),
          if (turn && s.deadline != null) _TurnRing(g: g),
          avatar,
          if (idx >= 0) Positioned(top: -6, right: -6, child: RankBadge(idx, s.order.length)),
          if (offline) Positioned(bottom: 0, left: 0, child: Container(width: 12, height: 12, decoration: BoxDecoration(color: C.inkMute, shape: BoxShape.circle, border: Border.all(color: C.night, width: 2)))),
          if (p?.autopilot == true) const Positioned(bottom: -4, left: -6, child: JIcon('bot', size: 20, color: C.goldSoft)),
        ]),
        const SizedBox(height: 5),
        Row(mainAxisSize: MainAxisSize.min, children: [
          if (g.profiles[id]?.lootEmblem case final emblem?) ...[
            SvgPicture.network(Api.lootUrl(emblem), width: 15, height: 15),
            const SizedBox(width: 3),
          ],
          Flexible(child: Text(g.nameOf(id), maxLines: 1, overflow: TextOverflow.ellipsis, style: T.label(13, color: turn ? C.goldSoft : C.ink))),
        ]),
        const SizedBox(height: 2),
        if (s.status == 'playing' && s.phase != 'draw')
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            child: Row(
              key: ValueKey('$count-$out-$passed'),
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!passed) ...[JIcon(out ? 'check' : 'cards', size: 14, color: out ? C.vert : C.inkSoft), const SizedBox(width: 3)],
                Text(out ? t('fertig') : passed ? t('passt') : '$count', style: T.label(12, color: out ? C.vert : C.inkSoft)),
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
      return s.draws.containsKey(g.me) ? t('Warte, bis alle gezogen haben …') : t('Zieh eine Karte um deinen Platz');
    case 'court':
      return t('Hofzeremonie: Bereit für die Steuern?');
    case 'tax':
      final mine = s.tax.where((t) => t.to == g.me && !t.done).firstOrNull;
      if (mine != null) return mine.count == 1 ? t('Gib 1 Karte zurück') : t('Gib {n} Karten zurück', {'n': mine.count});
      return t('Die Steuern werden gezahlt …');
    case 'play':
      if (s.turn == g.me) {
        final trick = s.trick;
        return trick == null ? t('Du spielst aus') : t('Du bist dran: schlag {cards} oder passe', {'cards': describeCards(trick.cards)});
      }
      return s.turn == null ? '…' : t('{name} ist dran', {'name': g.nameOf(s.turn!)});
    case 'roundEnd':
      return t('Runde {round} ist vorbei', {'round': s.round});
  }
  return '';
}
