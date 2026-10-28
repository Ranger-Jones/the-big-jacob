import 'package:flutter/material.dart';

import '../../game/models.dart';
import '../../game/tutorial.dart';
import 'finish_card.dart';
import 'lesson_card.dart';
import 'step_dots.dart';

/// The seven lessons in a row, then the finish card.
class LessonFlow extends StatefulWidget {
  final Deck deck;
  final VoidCallback onCampaign;
  const LessonFlow({super.key, required this.deck, required this.onCampaign});

  @override
  State<LessonFlow> createState() => _LessonFlowState();
}

class _LessonFlowState extends State<LessonFlow> {
  final _scroll = ScrollController();
  final _solved = <int>{};
  int _index = 0;
  bool _done = false;
  // +1 when moving forward, -1 when going back; drives the slide direction.
  int _dir = 1;

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _go(int next, {bool done = false}) {
    if (next == _index && done == _done) return;
    setState(() {
      _dir = done || next > _index ? 1 : -1;
      _index = next;
      _done = done;
    });
    if (_scroll.hasClients) {
      _scroll.animateTo(0, duration: const Duration(milliseconds: 320), curve: Curves.easeOutCubic);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lesson = lessons[_index];
    final current = _done
        ? FinishCard(
            key: const ValueKey('finish'),
            onCampaign: widget.onCampaign,
            onRestart: () => _go(0),
          )
        : LessonCard(
            key: ValueKey('lesson-${lesson.id}'),
            lesson: lesson,
            index: _index,
            deck: widget.deck,
            onSolved: () => setState(() => _solved.add(_index)),
            onBack: _index == 0 ? null : () => _go(_index - 1),
            onNext: () => _index == lessons.length - 1 ? _go(_index, done: true) : _go(_index + 1),
          );
    return SingleChildScrollView(
      controller: _scroll,
      padding: EdgeInsets.fromLTRB(12, 4, 12, 24 + MediaQuery.paddingOf(context).bottom),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            StepDots(current: _done ? -1 : _index, solved: _solved, onTap: (i) => _go(i)),
            const SizedBox(height: 10),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 280),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              layoutBuilder: (current, previous) => Stack(alignment: Alignment.topCenter, children: [...previous, ?current]),
              transitionBuilder: (child, anim) {
                // The incoming card slides in from the direction of travel, the outgoing one leaves the other way.
                final incoming = child.key == current.key;
                final dx = (incoming ? .08 : -.08) * _dir;
                return FadeTransition(
                  opacity: anim,
                  child: SlideTransition(position: Tween(begin: Offset(dx, 0), end: Offset.zero).animate(anim), child: child),
                );
              },
              child: current,
            ),
          ]),
        ),
      ),
    );
  }
}
