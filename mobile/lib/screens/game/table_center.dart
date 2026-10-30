import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../api.dart';
import '../../game/controller.dart';
import '../../game/models.dart';
import '../../game/rules.dart';
import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../../widgets/playing_card.dart';
import 'seats.dart';
import '../../widgets/jakob_icons.dart';

/// The felt with its wooden rim; the trick lands in the middle.
class FeltTable extends StatelessWidget {
  final Widget child;
  /// Equipped loot felt (item id) drawn over the green cloth.
  final String? felt;
  const FeltTable({super.key, required this.child, this.felt});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(64),
          gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF8A5A2E), C.wood, Color(0xFF3E2512)]),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .55), blurRadius: 30, offset: const Offset(0, 14))],
        ),
        padding: const EdgeInsets.all(9),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(56),
            gradient: const RadialGradient(center: Alignment(0, -.2), radius: 1, colors: [Color(0xFF2B7550), C.felt, C.feltDeep], stops: [0, .55, 1]),
            border: Border.all(color: C.gold.withValues(alpha: .35), width: 1.2),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(56),
            child: felt == null
                ? child
                : Stack(fit: StackFit.expand, children: [
                    SvgPicture.network(Api.lootUrl(felt!), fit: BoxFit.cover),
                    child,
                  ]),
          ),
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
              Text(s.turn == null ? '' : s.turn == g.me ? t('Du spielst aus') : t('{name} spielt aus', {'name': g.nameOf(s.turn!)}),
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
        child: Text(t('von {name}', {'name': g.nameOf(trick.by, you: true)}), style: T.label(13, color: C.ink)),
      ),
    ]);
  }
}

/// Draw phase: every player picks one face-down card; the lowest becomes Great Jakob.
/// With [reveal] the drawn cards stay on the table for a countdown before the court ceremony begins.
class DrawPanel extends StatefulWidget {
  final GameController g;
  final VoidCallback onDraw;
  final bool reveal;
  final VoidCallback? onRevealDone;
  const DrawPanel({super.key, required this.g, required this.onDraw, this.reveal = false, this.onRevealDone});

  @override
  State<DrawPanel> createState() => _DrawPanelState();
}

class _DrawPanelState extends State<DrawPanel> {
  static const _countdown = 5;
  int _left = _countdown;
  int? _picked;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    if (widget.reveal) _startCountdown();
  }

  @override
  void didUpdateWidget(DrawPanel old) {
    super.didUpdateWidget(old);
    if (widget.reveal && !old.reveal) _startCountdown();
  }

  void _startCountdown() {
    _timer?.cancel();
    _left = _countdown;
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      HapticFeedback.selectionClick();
      if (_left <= 1) {
        t.cancel();
        widget.onRevealDone?.call();
      } else {
        setState(() => _left--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final g = widget.g;
    final s = g.state!;
    final draws = s.draws;
    final players = s.players.where((p) => !p.left).toList();
    final myDeck = g.deckOf(g.me);
    final mustPick = !widget.reveal && !g.spectating && s.phase == 'draw' && !draws.containsKey(g.me);
    // Lowest card wins; ties go to whoever drew first (the order the server decided).
    final winner = widget.reveal && s.order.isNotEmpty ? s.order.first : null;

    // On the felt: the fan to pick from, then your card (or the winner's) – everybody's cards are shown
    // large in the empty hand slot below (DrawResults), so nothing has to shrink with many players.
    final area = FeltArea.of(context) ?? const Size(340, 300);
    const header = 64.0;
    final drawn = players.where((p) => draws.containsKey(p.id)).length;
    final featured = widget.reveal ? winner : g.me;
    final featuredCard = featured == null ? null : draws[featured];
    final bigW = ((area.height - header - 90) / 1.4).clamp(48.0, 92.0);
    Widget body;
    if (mustPick) {
      final byHeight = (area.height - header - 40) / 2.45;
      final fanW = math.min(area.width / 4.4, byHeight).clamp(48.0, 84.0);
      body = Column(mainAxisSize: MainAxisSize.min, children: [
        SizedBox(
          // Room for the rotated outer cards, so the line below never runs into the fan.
          height: fanW * 1.4 + fanW * .75,
          width: area.width,
          child: Stack(alignment: Alignment.bottomCenter, children: [
            for (var i = 0; i < 7; i++)
              // The translate must be the outermost widget: wrappers around it (like the entry animation)
              // keep the untranslated box for hit tests, so only the middle card could be tapped.
              Transform.translate(
                offset: Offset((i - 3) * fanW * .55, (i - 3).abs() * fanW * .09),
                child: Transform.rotate(
                  angle: (i - 3) * .12,
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: _picked != null || g.busy
                        ? null
                        : () {
                            HapticFeedback.mediumImpact();
                            setState(() => _picked = i);
                            widget.onDraw();
                          },
                    child: AnimatedSlide(
                      duration: const Duration(milliseconds: 220),
                      offset: Offset(0, _picked == i ? -.18 : 0),
                      child: CardBack(deck: myDeck, width: fanW, loot: g.profiles[g.me]?.lootBack),
                    ).animate(delay: (i * 60).ms).fadeIn(duration: 250.ms).moveY(begin: 24, end: 0, curve: Curves.easeOutBack),
                  ),
                ),
              ),
          ]),
        ),
        // The rotated outer cards reach below the stack's box.
        SizedBox(height: fanW * .3),
        Text(drawn == 0 ? t('Noch hat niemand gezogen') : t('{n} von {total} haben gezogen', {'n': drawn, 'total': players.length}), style: T.label(13)),
      ]);
    } else {
      body = Row(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.center, children: [
        if (featuredCard != null)
          Column(mainAxisSize: MainAxisSize.min, children: [
            if (widget.reveal) const JIcon('crown', size: 24, color: C.gold).animate().scaleXY(begin: 0, end: 1, curve: Curves.easeOutBack, duration: 450.ms),
            Container(
              decoration: widget.reveal
                  ? BoxDecoration(borderRadius: BorderRadius.circular(10), boxShadow: [BoxShadow(color: C.gold.withValues(alpha: .7), blurRadius: 22)])
                  : null,
              child: PlayingCard(rank: featuredCard, deck: g.deckOf(featured!) ?? myDeck!, width: bigW)
                  .animate(key: ValueKey('big-$featured'))
                  .flipH(begin: -1, end: 0, duration: 450.ms),
            ),
          ]),
        const SizedBox(width: 22),
        Column(mainAxisSize: MainAxisSize.min, children: [
          if (widget.reveal) ...[
            Text('$_left', style: T.display(56, color: C.goldSoft))
                .animate(key: ValueKey(_left))
                .scaleXY(begin: 1.8, end: 1, duration: 380.ms, curve: Curves.easeOutBack)
                .fadeIn(duration: 160.ms),
            ConstrainedBox(constraints: const BoxConstraints(maxWidth: 130), child: Text(t('Gleich beginnt die Hofzeremonie'), textAlign: TextAlign.center, style: T.body(13, color: C.inkSoft))),
          ] else ...[
            Text('$drawn / ${players.length}', style: T.display(40, color: C.goldSoft)),
            Text(t('haben gezogen'), style: T.body(13, color: C.inkSoft)),
          ],
        ]),
      ]);
    }

    return Column(mainAxisSize: MainAxisSize.min, children: [
      Text(widget.reveal ? t('Die Karten liegen offen') : t('Wer wird Großer Jakob?'), style: T.display(24)),
      const SizedBox(height: 4),
      Text(
        widget.reveal ? t('{name} sitzt ganz oben', {'name': g.nameOf(winner ?? '', you: true)}) : mustPick ? t('Tippe auf eine verdeckte Karte.') : t('Die kleinste Zahl sitzt ganz oben.'),
        style: T.body(14, color: widget.reveal ? C.goldSoft : C.inkSoft, weight: widget.reveal ? FontWeight.w800 : FontWeight.w500),
      ),
      const SizedBox(height: 14),
      body,
    ]);
  }
}

/// Everybody's drawn card, shown large in the (still empty) hand slot under the table during the draw.
class DrawResults extends StatelessWidget {
  final GameController g;
  final bool reveal;
  const DrawResults({super.key, required this.g, this.reveal = false});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final draws = s.draws;
    final players = s.players.where((p) => !p.left).toList();
    final winner = reveal && s.order.isNotEmpty ? s.order.first : null;
    final myDeck = g.deckOf(g.me);
    return LayoutBuilder(builder: (context, box) {
      final n = math.max(1, players.length);
      final rows = n <= 4 ? 1 : n <= 8 ? 2 : 3;
      final perRow = (n / rows).ceil();
      // Every seat takes the card plus 6 (name box) plus 8 (padding left and right).
      final byWidth = box.maxWidth / perRow - 14;
      final byHeight = (box.maxHeight - rows * 26 - (rows - 1) * 6) / (rows * 1.4);
      final cardW = math.min(byWidth, byHeight).clamp(30.0, 92.0);
      Widget seat(Player p) => SizedBox(
              width: cardW + 6,
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  decoration: p.id == winner
                      ? BoxDecoration(borderRadius: BorderRadius.circular(8), boxShadow: [BoxShadow(color: C.gold.withValues(alpha: .7), blurRadius: 16)])
                      : null,
                  child: draws[p.id] != null
                      ? PlayingCard(rank: draws[p.id]!, deck: g.deckOf(p.id) ?? myDeck!, width: cardW)
                          .animate(key: ValueKey('drawn-${p.id}'))
                          .flipH(begin: -1, end: 0, duration: 450.ms)
                      : CardBack(deck: g.deckOf(p.id), width: cardW, loot: g.profiles[p.id]?.lootBack),
                ),
                const SizedBox(height: 3),
                Text(g.nameOf(p.id, you: true), maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center,
                    style: T.label(12, color: p.id == winner ? C.goldSoft : C.ink)),
              ]),
            );
      // Even rows (4 + 4 rather than 7 + 1), centred.
      return Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        for (var r = 0; r < rows; r++)
          Padding(
            padding: EdgeInsets.only(top: r == 0 ? 0 : 6),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              for (final p in players.skip(r * perRow).take(perRow)) Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: seat(p)),
            ]),
          ),
      ]);
    });
  }
}

/// Size of the felt the table center is drawn on (the center itself sits in a scale-down box,
/// so panels that want to fill the felt read the real space from here).
class FeltArea extends InheritedWidget {
  final Size size;
  const FeltArea({super.key, required this.size, required super.child});

  static Size? of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<FeltArea>()?.size;

  @override
  bool updateShouldNotify(FeltArea old) => old.size != size;
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
      Text(t('Runde {round}', {'round': s.round}), style: T.display(26)),
      if (s.revolution != null)
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            JIcon(s.revolution!['grand'] == true ? 'flame' : 'fist', size: 22, color: C.goldSoft),
            const SizedBox(width: 6),
            Text(s.revolution!['grand'] == true ? t('Große Revolution!') : t('Revolution – keine Steuern!'), style: T.display(20, color: C.goldSoft)),
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
              Text(t(event.title), style: T.body(15, weight: FontWeight.w800, color: C.goldSoft)),
            ]),
            const SizedBox(height: 2),
            Text(t(event.text), textAlign: TextAlign.center, style: T.body(14)),
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
      Text(t('Steuern'), style: T.display(28)),
      const SizedBox(height: 10),
      if (s.tax.isEmpty) Text(t('Diese Runde zahlt niemand.'), style: T.body(15, color: C.inkSoft)),
      for (final tax in s.tax)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Text(g.nameOf(tax.from, you: true), style: T.body(15, weight: FontWeight.w700)),
            Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Text('→ ${tax.count} →', style: T.label(13, color: C.goldSoft))),
            Text(g.nameOf(tax.to, you: true), style: T.body(15, weight: FontWeight.w700)),
            const SizedBox(width: 8),
            Icon(tax.done ? Icons.check_circle_rounded : Icons.hourglass_top_rounded, size: 16, color: tax.done ? C.vert : C.inkMute),
          ]),
        ),
      if (g.hand.received.isNotEmpty) ...[
        const SizedBox(height: 10),
        Text(t('Du hast {cards} bekommen.', {'cards': describeCards(g.hand.received)}), style: T.body(14, color: C.goldSoft)),
      ],
      if (g.hand.gave.isNotEmpty) Text(t('Du hast {cards} abgegeben.', {'cards': describeCards(g.hand.gave)}), style: T.body(14, color: C.inkSoft)),
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
      Text(t('Runde {round} vorbei', {'round': s.round}), style: T.display(26)),
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
      'snap' => ('bolt', t('Schnapp!'), C.goldSoft),
      'bomb' => ('bomb', t('Bombe!'), C.wax),
      'unbeatable' => ('crown', t('Unschlagbar!'), C.goldSoft),
      'revolution' => ('fist', t('Revolution!'), C.wax),
      'grandRevolution' => ('flame', t('Große Revolution!'), C.wax),
      'kingFall' => ('crown', t('Königssturz!'), C.wax),
      'throne' => ('castle', t('Thronfolge!'), C.goldSoft),
      _ => ('sparkles', who == t('Du') ? t('Du bist raus!') : t('{name} ist raus!', {'name': who}), C.vert),
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
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.symmetric(horizontal: 14),
        padding: const EdgeInsets.only(left: 14, right: 4),
        decoration: BoxDecoration(color: C.gold.withValues(alpha: .14), borderRadius: BorderRadius.circular(99), border: Border.all(color: C.gold.withValues(alpha: .6))),
        child: Row(children: [
          const JIcon('bot', size: 22, color: C.goldSoft),
          const SizedBox(width: 8),
          Expanded(child: Text(t('Ein Bot spielt gerade für dich.'), maxLines: 1, overflow: TextOverflow.ellipsis, style: T.body(14, weight: FontWeight.w700))),
          TextButton(
            onPressed: () => g.dispatch({'type': 'resume'}),
            child: Text(t('Zurück ins Spiel'), style: T.body(14, color: C.goldSoft, weight: FontWeight.w800)),
          ),
        ]),
      );
}
