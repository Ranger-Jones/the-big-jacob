import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/controller.dart';
import '../../game/models.dart';
import '../../game/rules.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import 'chat_sheet.dart';
import 'emoji_layer.dart';
import 'quip_bubble.dart';
import 'hand_fan.dart';
import 'seats.dart';
import 'table_center.dart';
import '../../widgets/jakob_icons.dart';

/// A running game: seats on top, the felt in the middle, your hand and actions at the bottom.
class TableView extends StatefulWidget {
  final GameController g;
  final VoidCallback onLeave;
  const TableView({super.key, required this.g, required this.onLeave});

  @override
  State<TableView> createState() => _TableViewState();
}

class _TableViewState extends State<TableView> {
  Selection _selection = {};
  String _selectionKey = '';
  int _logSeen = -1;
  String? _prevPhase;
  /// Round 1: after the last card was drawn the draws stay visible for a countdown.
  bool _revealing = false;
  ({String kind, String who, int id})? _burst;
  int _burstId = 0;

  GameController get g => widget.g;

  @override
  void initState() {
    super.initState();
    _logSeen = g.state?.log.length ?? 0;
    _selectionKey = _keyOf(g.state);
    _prevPhase = g.state?.phase;
    g.addListener(_onChange);
  }

  @override
  void dispose() {
    g.removeListener(_onChange);
    super.dispose();
  }

  String _keyOf(GameState? s) => s == null ? '' : '${s.round}-${s.phase}-${s.turn}-${s.trick?.seq}-${g.hand.cards.length}';

  void _onChange() {
    final s = g.state;
    if (s == null) return;
    // A new phase, turn or hand resets the selection (like the web table).
    final key = _keyOf(s);
    if (key != _selectionKey) {
      _selectionKey = key;
      _selection = {};
    }
    if (_prevPhase == 'draw' && s.phase != 'draw' && s.round == 1) _revealing = true;
    _prevPhase = s.phase;
    final log = s.log;
    if (_logSeen < 0 || _logSeen > log.length) _logSeen = log.length;
    for (final e in log.skip(_logSeen)) {
      final kind = e['kind'] as String?;
      if (kind != null && Burst.kinds.contains(kind)) {
        final who = kind == 'snap' ? g.nameOf(e['to'] as String? ?? '', you: true) : g.nameOf(e['by'] as String? ?? '', you: true);
        _burst = (kind: kind, who: who, id: ++_burstId);
        HapticFeedback.mediumImpact();
      }
      if (kind == 'clear' && e['by'] == g.me) HapticFeedback.selectionClick();
    }
    _logSeen = log.length;
    if (s.phase == 'play' && s.turn == g.me) HapticFeedback.lightImpact();
  }

  Future<void> _act(Map<String, dynamic> action, {bool move = true}) async {
    await g.dispatch(action, move: move);
    if (!mounted) return;
    if (g.lastError != null) {
      toast(context, g.lastError!, error: true);
      g.lastError = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: g,
      builder: (context, _) {
        final s = g.state!;
        final me = g.me;
        final deck = g.deckOf(me);
        final myTurn = s.phase == 'play' && s.turn == me;
        final myTax = s.phase == 'tax' ? s.tax.where((t) => t.to == me && !t.done).firstOrNull : null;
        final mode = myTax != null ? HandMode.tax : myTurn ? HandMode.play : HandMode.view;
        final playable = myTurn ? playableRanks(g.hand.cards, s.trick, s.ctx) : null;
        final chosen = selectedCards(_selection);
        final idx = s.order.indexOf(me);
        final autopilot = s.player(me)?.autopilot == true;

        Widget center;
        switch (s.phase) {
          case 'draw':
            center = DrawPanel(g: g, onDraw: () => _act({'type': 'draw'}, move: false));
          case 'court':
            center = CourtPanel(g: g);
          case 'tax':
            center = TaxPanel(g: g);
          case 'roundEnd':
            center = RoundEndPanel(g: g);
          default:
            center = TrickView(g: g);
        }
        if (_revealing) {
          center = DrawPanel(g: g, onDraw: () {}, reveal: true, onRevealDone: () => setState(() => _revealing = false));
        }

        return Stack(children: [
          Column(children: [
            _TopBar(g: g, onLeave: widget.onLeave),
            SeatsStrip(g: g),
            Expanded(
              child: FeltTable(
                felt: g.profiles[g.me]?.lootFelt,
                child: Stack(children: [
                  // Everything on the felt (trick, court order, round results) scales down to fit, never cut off.
                  Positioned.fill(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 18, 16, 34),
                      child: LayoutBuilder(builder: (context, box) {
                        return FittedBox(
                          fit: BoxFit.scaleDown,
                          child: SizedBox(
                            width: box.maxWidth,
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 350),
                              child: KeyedSubtree(key: ValueKey(_revealing ? 'reveal' : '${s.phase}-${s.round}'), child: center),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                  if (s.setting('tracker') && s.phase == 'play') Positioned(left: 0, right: 0, bottom: 10, child: _Tracker(played: s.played)),
                  // Duel: the face-down reserve that whoever passes draws from.
                  if (s.setting('duel') && s.phase == 'play') Positioned(top: 10, right: 14, child: Pill('Hofstapel ${s.reserveCount}', jicon: 'cards', color: Colors.black38, textColor: C.goldSoft)),
                ]),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 42,
              child: autopilot
                  ? AutopilotBanner(g: g)
                  : Center(child: _StatusLine(text: _revealing ? 'Gleich geht es los …' : statusLine(g), active: !_revealing && (myTurn || myTax != null))),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Row(children: [
                if (idx >= 0) ...[RankBadge(idx, s.order.length, size: 20), const SizedBox(width: 6), Text(rankTitle(idx, s.order.length), style: T.label(13, color: C.goldSoft))],
                const Spacer(),
                Text('${s.points[me] ?? 0} Punkte', style: T.label(13, color: C.inkSoft)),
                if (g.hand.mission != null) ...[
                  const SizedBox(width: 10),
                  _MissionChip(mission: g.hand.mission!),
                ],
              ]),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: SizedBox(
                height: HandFan.heightFor(MediaQuery.sizeOf(context).width - 20),
                child: deck == null || s.phase == 'draw' || _revealing ? null : HandFan(
                  cards: g.hand.cards,
                  deck: deck,
                  selection: _selection,
                  onChanged: (sel) => setState(() => _selection = sel),
                  mode: mode,
                  trick: s.trick,
                  taxCount: myTax?.count ?? 0,
                  playable: playable,
                  received: s.phase == 'tax' || s.phase == 'play' ? g.hand.received : const [],
                  dealKey: s.round,
                ),
              ),
            ),
            SizedBox(
              height: 62,
              child: _revealing ? null : _ActionBar(
              g: g,
              myTurn: myTurn,
              myTax: myTax,
              chosen: chosen,
              onPlay: () => _act({'type': 'play', 'cards': chosen}),
              onPass: () => _act({'type': 'pass'}),
              onReturn: () => _act({'type': 'taxReturn', 'cards': chosen}),
              onReady: () => _act({'type': 'ready'}, move: false),
              onDraw: () => _act({'type': 'draw'}, move: false),
              onSpecial: (type) => _act({'type': type}, move: false),
            ),
            ),
            SizedBox(height: MediaQuery.paddingOf(context).bottom + 6),
          ]),
          if (_burst != null)
            Positioned.fill(child: Burst(key: ValueKey(_burst!.id), kind: _burst!.kind, who: _burst!.who)),
          Positioned.fill(child: EmojiLayer(g: g)),
          Positioned(left: 0, right: 0, top: MediaQuery.paddingOf(context).top + 150, child: Center(child: QuipBubble(g: g))),
        ]);
      },
    );
  }
}

class _TopBar extends StatelessWidget {
  final GameController g;
  final VoidCallback onLeave;
  const _TopBar({required this.g, required this.onLeave});

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final event = s.event != null ? eventText[s.event] : null;
    final rounds = s.goal != null ? 'Ziel ${s.goal} P.' : 'von ${s.rounds}';
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(6, 2, 6, 0),
        child: Row(children: [
          IconButton(onPressed: onLeave, icon: const Icon(Icons.close_rounded, color: C.inkSoft), tooltip: 'Tisch verlassen'),
          Expanded(
            child: Column(children: [
              Text(s.phase == 'draw' ? 'Platzwahl' : 'Runde ${s.round} $rounds', style: T.display(20)),
              if (event != null)
                Row(mainAxisSize: MainAxisSize.min, children: [
                  JIcon(eventIcons[s.event] ?? 'sparkles', size: 15, color: C.goldSoft),
                  const SizedBox(width: 4),
                  Text(event.title, style: T.label(12, color: C.goldSoft)),
                ]),
              if (!g.connected) Text('Verbindung wird wiederhergestellt …', style: T.label(12, color: C.wax)),
            ]),
          ),
          _ReactionButton(g: g),
          if (s.setting('chat')) ChatButton(g: g),
          IconButton(onPressed: () => showLog(context, g), icon: const Icon(Icons.receipt_long_rounded, color: C.inkSoft), tooltip: 'Verlauf'),
        ]),
      ),
    );
  }
}

class _StatusLine extends StatelessWidget {
  final String text;
  final bool active;
  const _StatusLine({required this.text, required this.active});

  @override
  Widget build(BuildContext context) {
    final label = AnimatedSwitcher(
      duration: const Duration(milliseconds: 250),
      child: Container(
        key: ValueKey(text),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
        decoration: BoxDecoration(
          color: active ? C.gold.withValues(alpha: .18) : Colors.transparent,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: active ? C.gold.withValues(alpha: .6) : Colors.transparent),
        ),
        child: Text(text, textAlign: TextAlign.center, style: T.body(15, color: active ? C.goldSoft : C.inkSoft, weight: FontWeight.w700)),
      ),
    );
    if (!active) return label;
    return label.animate(onPlay: (c) => c.repeat(reverse: true)).scaleXY(begin: 1, end: 1.03, duration: 900.ms);
  }
}

class _ActionBar extends StatelessWidget {
  final GameController g;
  final bool myTurn;
  final TaxPair? myTax;
  final List<int> chosen;
  final VoidCallback onPlay, onPass, onReturn, onReady, onDraw;
  final void Function(String type) onSpecial;
  const _ActionBar({
    required this.g, required this.myTurn, required this.myTax, required this.chosen,
    required this.onPlay, required this.onPass, required this.onReturn, required this.onReady, required this.onDraw, required this.onSpecial,
  });

  @override
  Widget build(BuildContext context) {
    final s = g.state!;
    final me = g.me;
    Widget? bar;
    if (s.phase == 'court' && !s.ready.contains(me)) {
      final jesters = g.hand.cards.where((c) => c == jester).length;
      final present = s.order.where((id) => s.player(id)?.left != true).toList();
      final canRevolt = s.setting('revolution') && s.revolution == null && jesters >= 2;
      final mercyUsed = (s.raw['mercyUsed'] as List?)?.contains(me) == true;
      final canMercy = s.setting('mercy') && present.isNotEmpty && present.last == me && !mercyUsed && s.raw['mercyRound'] != true && s.revolution == null && s.round > 1;
      final canAbdicate = s.setting('abdicate') && present.isNotEmpty && present.first == me && present.length >= 3 && s.raw['abdicated'] != true && s.revolution == null;
      // One row only (the table above must keep its height): special moves sit next to "Bereit".
      bar = Row(children: [
        if (canRevolt) ...[Expanded(child: SoftButton(label: 'Revolution!', jicon: 'fist', danger: true, onPressed: () => onSpecial('revolution'))), const SizedBox(width: 8)],
        if (canMercy) ...[Expanded(child: SoftButton(label: 'Gnade', jicon: 'dove', onPressed: () => onSpecial('mercy'))), const SizedBox(width: 8)],
        if (canAbdicate) ...[Expanded(child: SoftButton(label: 'Abdanken', jicon: 'throne', onPressed: () => onSpecial('abdicate'))), const SizedBox(width: 8)],
        Expanded(child: GoldButton(label: 'Bereit', jicon: 'check', onPressed: onReady, busy: g.busy)),
      ]);
    } else if (s.phase == 'roundEnd' && !s.ready.contains(me)) {
      bar = GoldButton(label: 'Nächste Runde', icon: Icons.arrow_forward_rounded, onPressed: onReady, busy: g.busy);
    } else if (myTax != null) {
      final left = myTax!.count - chosen.length;
      bar = GoldButton(
        label: left > 0 ? 'Noch $left ${left == 1 ? 'Karte' : 'Karten'} wählen' : 'Zurückgeben',
        icon: Icons.redo_rounded,
        onPressed: left == 0 ? onReturn : null,
        busy: g.busy,
      );
    } else if (myTurn) {
      final error = chosen.isEmpty ? null : judgePlay(chosen, s.trick, s.ctx);
      bar = Row(children: [
        if (s.trick != null) ...[
          SizedBox(width: 120, child: SoftButton(label: s.setting('duel') && s.reserveCount > 0 ? 'Passen +1' : 'Passen', onPressed: onPass)),
          const SizedBox(width: 10),
        ],
        Expanded(
          child: GoldButton(
            label: chosen.isEmpty ? 'Karten wählen' : error ?? 'Lege ${describeCards(chosen)}',
            icon: chosen.isEmpty || error != null ? null : Icons.north_rounded,
            onPressed: chosen.isNotEmpty && error == null ? onPlay : null,
            busy: g.busy,
          ),
        ),
      ]);
    }
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 200),
      child: bar == null ? const SizedBox.shrink() : Padding(key: ValueKey(s.phase), padding: const EdgeInsets.fromLTRB(14, 4, 14, 0), child: bar),
    );
  }
}

class _MissionChip extends StatelessWidget {
  final Map mission;
  const _MissionChip({required this.mission});

  @override
  Widget build(BuildContext context) {
    final info = missionText[mission['id']];
    if (info == null) return const SizedBox();
    final done = mission['done'] == true;
    return GestureDetector(
      onTap: () => toast(context, '${info.title}: ${info.text}${done ? ' (erfüllt!)' : ''}'),
      child: Pill('Mission', jicon: missionIcons[mission['id']] ?? 'target', color: done ? C.vert.withValues(alpha: .3) : C.surfaceHi, textColor: done ? C.vert : C.goldSoft),
    );
  }
}

/// Played cards this round ("Kartengedächtnis") as a slim strip of counters.
class _Tracker extends StatelessWidget {
  final List<int> played;
  const _Tracker({required this.played});

  @override
  Widget build(BuildContext context) {
    final counts = countBy(played);
    if (counts.isEmpty) return const SizedBox();
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: Colors.black.withValues(alpha: .28), borderRadius: BorderRadius.circular(99)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          for (var r = 1; r <= 13; r++)
            if ((counts[r] ?? 0) > 0)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: Text('${r == jester ? 'N' : r}:${counts[r]}', style: T.label(11, color: (counts[r] ?? 0) >= (r == jester ? 2 : r) ? C.inkMute : C.ink)),
              ),
        ]),
      ),
    );
  }
}

class _ReactionButton extends StatelessWidget {
  final GameController g;
  const _ReactionButton({required this.g});

  @override
  Widget build(BuildContext context) => IconButton(
        tooltip: 'Reaktion',
        icon: const Icon(Icons.add_reaction_rounded, color: C.inkSoft),
        onPressed: () => showModalBottomSheet(
          context: context,
          builder: (ctx) => Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
            child: Wrap(alignment: WrapAlignment.center, spacing: 6, runSpacing: 6, children: [
              for (final e in allowedEmojis)
                InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () {
                    HapticFeedback.selectionClick();
                    g.sendEmoji(e);
                    Navigator.pop(ctx);
                  },
                  child: Padding(padding: const EdgeInsets.all(6), child: Text(e, style: const TextStyle(fontSize: 30))),
                ),
            ]),
          ),
        ),
      );
}

void showLog(BuildContext context, GameController g) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: .6,
      maxChildSize: .9,
      builder: (ctx, scroll) => ListenableBuilder(
        listenable: g,
        builder: (ctx, _) {
          final lines = [
            for (final e in g.state!.log.reversed)
              if (describeLog(e, (id) => g.nameOf(id), g.me) case final text?) (logIcons[e['kind']], stripEmoji(text)),
          ];
          return ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(22, 0, 22, 30), children: [
            Text('Verlauf', style: T.display(28)),
            const SizedBox(height: 10),
            for (final (icon, text) in lines)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SizedBox(width: 26, child: icon == null ? null : JIcon(icon, size: 18, color: C.goldSoft)),
                  Expanded(child: Text(text, style: T.body(15))),
                ]),
              ),
          ]);
        },
      ),
    ),
  );
}
