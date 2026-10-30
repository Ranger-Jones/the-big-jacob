import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/controller.dart';
import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../bots_screen.dart';

/// What a persona bot just said, as a speech bubble with its portrait under the seats (like the web).
class QuipBubble extends StatefulWidget {
  final GameController g;
  const QuipBubble({super.key, required this.g});

  @override
  State<QuipBubble> createState() => _QuipBubbleState();
}

class _QuipBubbleState extends State<QuipBubble> {
  int? _seen;
  Map? _shown;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    final s = widget.g.state;
    final quip = s?.quip;
    // A line from the last couple of moves still shows when the table opens (the greeting).
    if (quip != null && s!.moveSeq - ((quip['seq'] as num?)?.toInt() ?? 0) > 2) _seen = (quip['seq'] as num?)?.toInt();
    widget.g.addListener(_check);
    _check();
  }

  @override
  void dispose() {
    widget.g.removeListener(_check);
    _timer?.cancel();
    super.dispose();
  }

  void _check() {
    final quip = widget.g.state?.quip;
    final seq = (quip?['seq'] as num?)?.toInt();
    if (quip == null || seq == _seen) return;
    _seen = seq;
    _timer?.cancel();
    setState(() => _shown = quip);
    _timer = Timer(const Duration(milliseconds: 4500), () {
      if (mounted) setState(() => _shown = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    final quip = _shown;
    final bot = quip == null ? null : widget.g.state?.player(quip['by'] as String? ?? '')?.bot;
    return IgnorePointer(
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        child: quip == null || bot == null
            ? const SizedBox.shrink()
            : Padding(
                key: ValueKey(quip['seq']),
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  BotPortrait(bot.name, size: 50, highlight: true),
                  const SizedBox(width: 10),
                  Flexible(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                      decoration: BoxDecoration(
                        color: C.ink,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: C.gold, width: 2),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .4), blurRadius: 14, offset: const Offset(0, 4))],
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                        Text(t(bot.name), style: T.label(11.5, color: const Color(0xFF6B4F3A))),
                        Text(t('„{text}“', {'text': t(quip['text'] as String? ?? '')}), style: T.body(15.5, color: C.onGold, weight: FontWeight.w800, height: 1.25)),
                      ]),
                    ),
                  ),
                ]),
              ).animate().fadeIn(duration: 200.ms).slideY(begin: -.25, end: 0, curve: Curves.easeOutBack),
      ),
    );
  }
}
