import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../game/controller.dart';
import '../i18n/i18n.dart';
import '../push.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'game/lobby_view.dart';
import 'game/results_view.dart';
import 'game/table_view.dart';
import '../widgets/jakob_icons.dart';

Future<void> openTable(BuildContext context, String code, {bool spectate = false}) =>
    Navigator.push(context, MaterialPageRoute(builder: (_) => GameScreen(code: code, spectate: spectate)));

/// One table, from lobby to results.
class GameScreen extends StatefulWidget {
  final String code;
  /// Watch a friend's game instead of taking a seat.
  final bool spectate;
  const GameScreen({super.key, required this.code, this.spectate = false});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> with WidgetsBindingObserver {
  late final GameController _g = GameController(Supabase.instance.client.auth.currentUser!.id);
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Pushes about this very table are not shown as banners while it is open.
    Push.setActive(_link);
    _open();
  }

  String get _link => '/spiel/${widget.code.toUpperCase()}';

  Future<void> _open() async {
    final error = await _g.open(widget.code, spectate: widget.spectate);
    if (!mounted) return;
    setState(() {
      _error = error;
      _loading = false;
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Phones suspend websockets in the background: catch up when we come back.
    if (state == AppLifecycleState.resumed) _g.refetch();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    Push.clearActive(_link);
    _g.dispose();
    super.dispose();
  }

  Future<void> _leave() async {
    final s = _g.state;
    if (s == null || s.status == 'finished' || _g.spectating) return Navigator.pop(context);
    final running = s.status == 'playing';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(running ? t('Tisch verlassen?') : t('Lobby verlassen?'), style: T.display(26)),
        content: Text(
          running ? t('Ein Bot übernimmt deinen Platz nicht automatisch – du verlässt das Spiel endgültig.') : t('Du kannst über den Code jederzeit zurückkommen.'),
          style: T.body(16, color: C.inkSoft),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(t('Bleiben'), style: T.body(16, weight: FontWeight.w700))),
          if (running) TextButton(onPressed: () => Navigator.pop(ctx, null), child: Text(t('Nur schließen'), style: T.body(16, color: C.inkSoft))),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(t('Verlassen'), style: T.body(16, color: C.wax, weight: FontWeight.w700))),
        ],
      ),
    );
    if (!mounted || ok == false) return;
    if (ok == true) await _g.dispatch({'type': 'leave'});
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _leave();
      },
      child: Scaffold(
        body: Backdrop(
          child: ListenableBuilder(
            listenable: _g,
            builder: (context, _) {
              if (_loading) return const Center(child: CircularProgressIndicator(color: C.gold));
              if (_error != null || _g.gone || _g.state == null) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const JIcon('castle', size: 64, color: C.inkSoft),
                      const SizedBox(height: 12),
                      Text(t(_error ?? 'Dieser Tisch wurde aufgelöst.'), textAlign: TextAlign.center, style: T.display(26)),
                      const SizedBox(height: 22),
                      GoldButton(label: t('Zurück zum Hof'), onPressed: () => Navigator.pop(context)),
                    ]),
                  ),
                );
              }
              final s = _g.state!;
              final Widget view = switch (s.status) {
                'lobby' => LobbyView(g: _g, onLeave: _leave),
                'finished' => ResultsView(
                    g: _g,
                    onLeave: () => Navigator.pop(context),
                    onRematch: (code) => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => GameScreen(code: code))),
                  ),
                _ => TableView(g: _g, onLeave: _leave),
              };
              return AnimatedSwitcher(duration: const Duration(milliseconds: 450), child: KeyedSubtree(key: ValueKey(s.status), child: view));
            },
          ),
        ),
      ),
    );
  }
}
