import 'package:confetti/confetti.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../api.dart';
import '../../game/controller.dart';
import '../../game/rules.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// The game is over: podium, final table, revealed missions, rematch.
class ResultsView extends StatefulWidget {
  final GameController g;
  final void Function(String code) onRematch;
  final VoidCallback onLeave;
  const ResultsView({super.key, required this.g, required this.onRematch, required this.onLeave});

  @override
  State<ResultsView> createState() => _ResultsViewState();
}

class _ResultsViewState extends State<ResultsView> {
  final _confetti = ConfettiController(duration: const Duration(seconds: 3));
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final places = widget.g.state!.placements();
    if (places[widget.g.me] == 1) _confetti.play();
  }

  @override
  void dispose() {
    _confetti.dispose();
    super.dispose();
  }

  Future<void> _rematch() async {
    setState(() => _busy = true);
    final res = await Api.post('rematch/${widget.g.game!.id}');
    if (!mounted) return;
    setState(() => _busy = false);
    if (!res.ok) return toast(context, res.error!, error: true);
    widget.onRematch((res.data as Map)['code'] as String);
  }

  @override
  Widget build(BuildContext context) {
    final g = widget.g;
    final s = g.state!;
    final places = s.placements();
    final ranked = s.players.where((p) => !p.left).toList()..sort((a, b) => (places[a.id] ?? 99) - (places[b.id] ?? 99));
    final mine = places[g.me] ?? 0;
    final missions = s.missionsRevealed;
    final podium = ranked.take(3).toList();
    return Stack(children: [
      ListView(
        padding: EdgeInsets.fromLTRB(18, MediaQuery.paddingOf(context).top + 18, 18, MediaQuery.paddingOf(context).bottom + 30),
        children: [
          Center(child: Text(mine == 1 ? 'Du bist der Große Jakob!' : 'Platz $mine', textAlign: TextAlign.center, style: T.display(40, color: mine == 1 ? C.goldSoft : C.ink))
              .animate().scaleXY(begin: .7, end: 1, curve: Curves.easeOutBack, duration: 600.ms)),
          if (s.throneWinner != null) Center(child: Text('🏰 Thronfolge von ${g.nameOf(s.throneWinner!, you: true)}', style: T.body(16, color: C.goldSoft))),
          const SizedBox(height: 24),
          SizedBox(
            height: 200,
            child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              for (final i in [1, 0, 2])
                if (i < podium.length)
                  Expanded(
                    child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                      if (i == 0) const Text('👑', style: TextStyle(fontSize: 30)).animate(delay: 900.ms).moveY(begin: -40, end: 0, curve: Curves.bounceOut, duration: 700.ms).fadeIn(),
                      Avatar(name: g.nameOf(podium[i].id), url: g.profiles[podium[i].id]?.avatarUrl, emoji: podium[i].bot?.emoji, size: i == 0 ? 64 : 50, ring: i == 0 ? C.gold : C.line),
                      const SizedBox(height: 6),
                      Text(g.nameOf(podium[i].id, you: true), maxLines: 1, overflow: TextOverflow.ellipsis, style: T.label(14, color: C.ink)),
                      const SizedBox(height: 6),
                      Container(
                        height: [96.0, 66.0, 46.0][i],
                        margin: const EdgeInsets.symmetric(horizontal: 6),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                          gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
                              colors: i == 0 ? [C.goldSoft, C.goldDeep] : [C.surfaceHi, C.surface]),
                        ),
                        child: Text('${s.points[podium[i].id] ?? 0}', style: T.display(26, color: i == 0 ? C.onGold : C.ink)),
                      ).animate().scaleY(begin: 0, end: 1, alignment: Alignment.bottomCenter, delay: (300 + (2 - i) * 150).ms, duration: 500.ms, curve: Curves.easeOutCubic),
                    ]),
                  ),
            ]),
          ),
          const SizedBox(height: 18),
          Panel(
            child: Column(children: [
              for (final p in ranked)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(children: [
                    SizedBox(width: 34, child: Text('${places[p.id]}.', style: T.display(20, color: p.id == g.me ? C.goldSoft : C.inkSoft))),
                    Avatar(name: g.nameOf(p.id), url: g.profiles[p.id]?.avatarUrl, emoji: p.bot?.emoji, size: 34),
                    const SizedBox(width: 10),
                    Expanded(child: Text(g.nameOf(p.id, you: true), style: T.body(16, weight: FontWeight.w700))),
                    if (missions?[p.id] is Map)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Text(
                          '${missionText[(missions![p.id] as Map)['id']]?.emoji ?? '📜'}${(missions[p.id] as Map)['done'] == true ? '✓' : '✗'}',
                          style: T.label(13, color: (missions[p.id] as Map)['done'] == true ? C.vert : C.inkMute),
                        ),
                      ),
                    Text('${s.points[p.id] ?? 0}', style: T.display(22)),
                  ]),
                ),
            ]),
          ),
          const SizedBox(height: 22),
          if (s.mode == 'normal' || s.mode == 'public')
            GoldButton(label: g.game!.rematchGameId != null ? 'Zur Revanche' : 'Revanche', icon: Icons.replay_rounded, busy: _busy, onPressed: _rematch),
          const SizedBox(height: 10),
          SoftButton(label: 'Zurück zum Hof', icon: Icons.castle_rounded, onPressed: widget.onLeave),
        ],
      ),
      Align(
        alignment: Alignment.topCenter,
        child: ConfettiWidget(
          confettiController: _confetti,
          blastDirectionality: BlastDirectionality.explosive,
          numberOfParticles: 28,
          gravity: .25,
          colors: const [C.gold, C.goldSoft, C.wax, C.azure, C.vert, C.ink],
        ),
      ),
    ]);
  }
}
