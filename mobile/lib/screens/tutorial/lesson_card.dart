import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/models.dart';
import '../../game/rules.dart';
import '../../game/tutorial.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../game/hand_fan.dart';
import 'lesson_table.dart';
import 'verdict_box.dart';

/// One interactive lesson: rule, task, table, hand, answer buttons and feedback.
/// Keyed by the lesson, so jumping to another lesson starts it fresh.
class LessonCard extends StatefulWidget {
  final Lesson lesson;
  final int index;
  final Deck deck;
  final VoidCallback onSolved;
  final VoidCallback? onBack;
  final VoidCallback onNext;
  const LessonCard({
    super.key,
    required this.lesson,
    required this.index,
    required this.deck,
    required this.onSolved,
    required this.onBack,
    required this.onNext,
  });

  @override
  State<LessonCard> createState() => _LessonCardState();
}

class _LessonCardState extends State<LessonCard> {
  Selection _selection = {};
  Verdict? _verdict;
  int _attempt = 0;
  List<int> _laid = const [];
  final _tried = <int>{};

  Lesson get lesson => widget.lesson;
  bool get _solved => _verdict?.ok == true;
  bool get _last => widget.index == lessons.length - 1;

  void _answer({List<int>? cards, bool pass = false, int? option}) {
    final v = checkLesson(lesson, cards: cards, pass: pass, option: option);
    if (v.ok) {
      HapticFeedback.mediumImpact();
    } else {
      HapticFeedback.lightImpact();
    }
    setState(() {
      _verdict = v;
      _attempt++;
      if (option != null) _tried.add(option);
      if (v.ok && lesson.kind == LessonKind.play && cards != null) {
        _laid = cards;
        _selection = {};
      }
    });
    if (v.ok) widget.onSolved();
  }

  @override
  Widget build(BuildContext context) {
    final trick = lessonTrick(lesson);
    final kind = lesson.kind;
    return Panel(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Lektion ${widget.index + 1} von ${lessons.length}'.toUpperCase(), style: T.label(12, color: C.gold).copyWith(letterSpacing: 1.6)),
          const SizedBox(height: 4),
          Text(lesson.title, style: T.display(36)),
          const SizedBox(height: 8),
          Text(lesson.text, style: T.body(16, color: C.inkSoft, height: 1.38)),
          const SizedBox(height: 14),
          _TaskBox(text: lesson.task),
          const SizedBox(height: 16),
          if (kind == LessonKind.play || kind == LessonKind.pass) ...[
            LessonTable(deck: widget.deck, trick: lesson.trick, laid: _laid, cleared: kind == LessonKind.pass && _solved),
            const SizedBox(height: 6),
          ],
          if (kind == LessonKind.quiz) ..._quiz() else ..._hand(trick),
          const SizedBox(height: 12),
          VerdictBox(verdict: _verdict, attempt: _attempt),
          const SizedBox(height: 10),
          _nav(),
        ],
      ),
    );
  }

  List<Widget> _hand(TrickInfo? trick) {
    final tax = lesson.kind == LessonKind.tax;
    final picked = selectedCards(_selection).length;
    return [
      HandFan(
        cards: removeCards(lesson.hand, _laid),
        deck: widget.deck,
        selection: _selection,
        trick: trick,
        dealKey: widget.index,
        mode: tax ? HandMode.tax : HandMode.play,
        taxCount: lesson.taxCount,
        playable: lesson.kind == LessonKind.play ? playableRanks(lesson.hand, trick, lessonCtx) : null,
        received: tax ? const [1, 2] : const [],
        onChanged: (s) {
          if (_solved) return;
          setState(() {
            _selection = s;
            _verdict = null;
          });
        },
      ),
      if (tax)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Text(
            'Ausgewählt: $picked von ${lesson.taxCount}',
            textAlign: TextAlign.center,
            style: T.label(14, color: picked == lesson.taxCount ? C.goldSoft : C.inkSoft),
          ),
        ),
      if (tax)
        GoldButton(
          label: 'Zurückgeben',
          icon: Icons.redo_rounded,
          onPressed: _solved ? null : () => _answer(cards: selectedCards(_selection)),
        )
      else
        Row(
          children: [
            Expanded(
              flex: 3,
              child: GoldButton(
                label: 'Legen',
                icon: Icons.style_rounded,
                onPressed: _solved ? null : () => _answer(cards: selectedCards(_selection)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 2,
              child: SoftButton(label: 'Passen', icon: Icons.front_hand_rounded, onPressed: _solved ? null : () => _answer(pass: true)),
            ),
          ],
        ),
    ];
  }

  List<Widget> _quiz() => [
    HandFan(cards: lesson.hand, deck: widget.deck, selection: const {}, mode: HandMode.view, dealKey: widget.index, onChanged: (_) {}),
    for (var i = 0; i < lesson.quiz.length; i++)
      Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: SoftButton(
          label: lesson.quiz[i].label,
          icon: !_tried.contains(i)
              ? Icons.radio_button_unchecked_rounded
              : lesson.quiz[i].correct
              ? Icons.check_circle_rounded
              : Icons.cancel_outlined,
          onPressed: _solved ? null : () => _answer(option: i),
        ),
      ).animate().fadeIn(delay: (200 + i * 70).ms, duration: 260.ms).slideY(begin: .2, end: 0, delay: (200 + i * 70).ms, duration: 260.ms),
  ];

  Widget _nav() => Row(
    children: [
      TextButton.icon(
        onPressed: widget.onBack,
        style: TextButton.styleFrom(foregroundColor: C.inkSoft, minimumSize: const Size(48, 48), padding: const EdgeInsets.symmetric(horizontal: 10)),
        icon: const Icon(Icons.chevron_left_rounded),
        label: Text(
          'Zurück',
          style: T.body(16, color: widget.onBack == null ? C.inkMute : C.inkSoft, weight: FontWeight.w700),
        ),
      ),
      const SizedBox(width: 8),
      const Spacer(),
      if (_solved)
        Flexible(
          flex: 6,
          child: GoldButton(
            label: _last ? 'Abschließen' : 'Nächste Lektion',
            icon: _last ? Icons.emoji_events_rounded : Icons.arrow_forward_rounded,
            expand: false,
            onPressed: widget.onNext,
          ).animate().fadeIn(duration: 220.ms).slideX(begin: .15, end: 0, duration: 280.ms, curve: Curves.easeOutCubic),
        ),
    ],
  );
}

/// The task, set apart in a gold-tinted box.
class _TaskBox extends StatelessWidget {
  final String text;
  const _TaskBox({required this.text});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(
      color: C.gold.withValues(alpha: .13),
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: C.gold.withValues(alpha: .42)),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 1),
          child: Icon(Icons.flag_rounded, size: 20, color: C.gold),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: T.body(16, color: C.goldSoft, weight: FontWeight.w800, height: 1.3),
          ),
        ),
      ],
    ),
  );
}
