import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import 'campaign_path.dart';
import '../../widgets/jakob_icons.dart';

/// Details of one station; resolves to true when the player wants to compete.
Future<bool?> showStageSheet(BuildContext context, {required Stage stage, required StageState state, required int total, bool lockedToday = false}) =>
    showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => _StageSheet(stage: stage, state: state, total: total, lockedToday: lockedToday),
    );

class _StageSheet extends StatelessWidget {
  final Stage stage;
  final StageState state;
  final int total;
  /// A station was already conquered today: the next new one opens tomorrow.
  final bool lockedToday;
  const _StageSheet({required this.stage, required this.state, required this.total, this.lockedToday = false});

  @override
  Widget build(BuildContext context) {
    final locked = state == StageState.locked;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.paddingOf(context).bottom + 24),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Center(child: StationNode(stage: stage, state: state, size: 92)).animate().scaleXY(begin: .7, end: 1, duration: 420.ms, curve: Curves.easeOutBack),
        const SizedBox(height: 14),
        Text(t('Station {n} von {total}', {'n': stage.level, 'total': total}).toUpperCase(), textAlign: TextAlign.center, style: T.label(12.5, color: C.goldSoft).copyWith(letterSpacing: 1.6)),
        const SizedBox(height: 4),
        Text(t(stage.place), textAlign: TextAlign.center, style: T.display(38)),
        const SizedBox(height: 12),
        Wrap(alignment: WrapAlignment.center, spacing: 8, runSpacing: 8, children: [
          Pill(t(stage.twist), icon: Icons.auto_awesome_rounded, textColor: C.goldSoft),
          Pill(t('{n} Gegner', {'n': stage.bots}), icon: Icons.smart_toy_rounded),
          if (state == StageState.won) Pill(t('Gewonnen'), icon: Icons.check_rounded, color: C.gold, textColor: C.onGold),
        ]),
        const SizedBox(height: 18),
        Panel(
          color: C.velvet,
          child: Text(t(stage.story), style: T.body(17, height: 1.4)),
        ).animate(delay: 120.ms).fadeIn(duration: 300.ms).slideY(begin: .1, end: 0),
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.workspace_premium_rounded, color: C.gold, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Builder(builder: (_) {
              // The title is highlighted inside the sentence, wherever the language puts it.
              final parts = (state == StageState.won ? t('Dein Titel von hier: {title}') : t('Ein Sieg macht dich zum {title}')).split('{title}');
              return Text.rich(TextSpan(style: T.body(15, color: C.inkSoft), children: [
                TextSpan(text: parts.first),
                TextSpan(text: t(stage.title), style: T.body(15, color: C.goldSoft, weight: FontWeight.w800)),
                if (parts.length > 1) TextSpan(text: parts[1]),
              ]));
            }),
          ),
        ]),
        const SizedBox(height: 20),
        if (locked)
          Panel(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(children: [
              const JIcon('lock', color: C.inkMute),
              const SizedBox(width: 10),
              Expanded(child: Text(t('Gewinne zuerst Station {n}, um hier anzutreten.', {'n': stage.level - 1}), style: T.body(15, color: C.inkSoft))),
            ]),
          )
        else if (lockedToday && state == StageState.next)
          Panel(
            glow: true,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(children: [
              const JIcon('hourglass', color: C.goldSoft),
              const SizedBox(width: 10),
              Expanded(child: Text(t('Heute hast du schon eine Station erobert. Diese wartet ab morgen auf dich.'), style: T.body(15, color: C.ink))),
            ]),
          )
        else
          GoldButton(
            label: state == StageState.won ? t('Erneut antreten') : t('Antreten'),
            jicon: 'play',
            large: true,
            onPressed: () => Navigator.pop(context, true),
          ),
      ]),
    );
  }
}
