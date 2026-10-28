import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../game/controller.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'game/lobby_view.dart';
import 'game/results_view.dart';
import 'game/table_view.dart';

Future<void> openTable(BuildContext context, String code) =>
    Navigator.push(context, MaterialPageRoute(builder: (_) => GameScreen(code: code)));

/// One table, from lobby to results.
class GameScreen extends StatefulWidget {
  final String code;
  const GameScreen({super.key, required this.code});

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
    _open();
  }

  Future<void> _open() async {
    final error = await _g.open(widget.code);
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
    _g.dispose();
    super.dispose();
  }

  Future<void> _leave() async {
    final s = _g.state;
    if (s == null || s.status == 'finished') return Navigator.pop(context);
    final running = s.status == 'playing';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(running ? 'Tisch verlassen?' : 'Lobby verlassen?', style: T.display(26)),
        content: Text(
          running ? 'Ein Bot übernimmt deinen Platz nicht automatisch – du verlässt das Spiel endgültig.' : 'Du kannst über den Code jederzeit zurückkommen.',
          style: T.body(16, color: C.inkSoft),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Bleiben', style: T.body(16, weight: FontWeight.w700))),
          if (running) TextButton(onPressed: () => Navigator.pop(ctx, null), child: Text('Nur schließen', style: T.body(16, color: C.inkSoft))),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text('Verlassen', style: T.body(16, color: C.wax, weight: FontWeight.w700))),
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
                      const Text('🏚️', style: TextStyle(fontSize: 56)),
                      const SizedBox(height: 12),
                      Text(_error ?? 'Dieser Tisch wurde aufgelöst.', textAlign: TextAlign.center, style: T.display(26)),
                      const SizedBox(height: 22),
                      GoldButton(label: 'Zurück zum Hof', onPressed: () => Navigator.pop(context)),
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
