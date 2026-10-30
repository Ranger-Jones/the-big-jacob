import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../api.dart';
import '../i18n/i18n.dart';
import '../i18n/language_picker.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/jakob_icons.dart';

/// The bouncer at the castle gate: one question before anyone gets in.
class GateScreen extends StatefulWidget {
  final void Function(String answer) onOpen;
  const GateScreen({super.key, required this.onOpen});

  @override
  State<GateScreen> createState() => _GateScreenState();
}

class _GateScreenState extends State<GateScreen> {
  final _answer = TextEditingController();
  bool _busy = false;
  String? _error;
  int _shake = 0;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final res = await Api.post('gate', {'answer': _answer.text});
    if (!mounted) return;
    setState(() => _busy = false);
    if (res.ok) {
      widget.onOpen(_answer.text.trim());
    } else {
      setState(() {
        _error = res.error;
        _shake++;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Backdrop(
        child: SafeArea(
          child: Stack(children: [
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(children: [
                  const JIcon('crown', size: 84, color: C.gold)
                      .animate(onPlay: (c) => c.repeat(reverse: true))
                      .moveY(begin: -4, end: 4, duration: 1800.ms, curve: Curves.easeInOut),
                  const SizedBox(height: 8),
                  Text(t('Der Große Jakob'), style: T.display(46, color: C.goldSoft)),
                  const SizedBox(height: 30),
                  Panel(
                    padding: const EdgeInsets.all(22),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(t('Halt! Wer da?'), style: T.display(32)),
                      const SizedBox(height: 4),
                      Text(t('Die Wache lässt nur ein, wer die Losung kennt.'), style: T.body(16, color: C.inkSoft)),
                      const SizedBox(height: 22),
                      Text(t('Wer ist mein Lieblings Rettungsdienstmitarbeiter?'), style: T.label(15, color: C.ink)),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _answer,
                        textInputAction: TextInputAction.go,
                        onSubmitted: (_) => _submit(),
                        style: T.body(18),
                        decoration: InputDecoration(hintText: t('Deine Antwort'), errorText: _error),
                      ).animate(key: ValueKey(_shake)).shakeX(hz: 5, amount: _shake == 0 ? 0 : 6, duration: 400.ms),
                      const SizedBox(height: 18),
                      GoldButton(label: t('Tor öffnen'), icon: Icons.key_rounded, busy: _busy, onPressed: _submit),
                    ]),
                  ).animate().fadeIn(duration: 500.ms).slideY(begin: .08, curve: Curves.easeOutCubic),
                ]),
              ),
            ),
            // Switch the language before anything else.
            const Positioned(top: 8, right: 12, child: LanguagePicker(compact: true)),
          ]),
        ),
      ),
    );
  }
}
