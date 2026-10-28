import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../theme.dart';
import '../../widgets/common.dart';
import 'campaign_path.dart';

/// Details of one station; resolves to true when the player wants to compete.
Future<bool?> showStageSheet(BuildContext context, {required Stage stage, required StageState state, required int total}) =>
    showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => _StageSheet(stage: stage, state: state, total: total),
    );

class _StageSheet extends StatelessWidget {
  final Stage stage;
  final StageState state;
  final int total;
  const _StageSheet({required this.stage, required this.state, required this.total});

  @override
  Widget build(BuildContext context) {
    final locked = state == StageState.locked;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.paddingOf(context).bottom + 24),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Center(child: StationNode(stage: stage, state: state, size: 92)).animate().scaleXY(begin: .7, end: 1, duration: 420.ms, curve: Curves.easeOutBack),
        const SizedBox(height: 14),
        Text('STATION ${stage.level} VON $total', textAlign: TextAlign.center, style: T.label(12.5, color: C.goldSoft).copyWith(letterSpacing: 1.6)),
        const SizedBox(height: 4),
        Text(stage.place, textAlign: TextAlign.center, style: T.display(38)),
        const SizedBox(height: 12),
        Wrap(alignment: WrapAlignment.center, spacing: 8, runSpacing: 8, children: [
          Pill(stage.twist, icon: Icons.auto_awesome_rounded, textColor: C.goldSoft),
          Pill('${stage.bots} Gegner', icon: Icons.smart_toy_rounded),
          if (state == StageState.won) const Pill('Gewonnen', icon: Icons.check_rounded, color: C.gold, textColor: C.onGold),
        ]),
        const SizedBox(height: 18),
        Panel(
          color: C.velvet,
          child: Text(stage.story, style: T.body(17, height: 1.4)),
        ).animate(delay: 120.ms).fadeIn(duration: 300.ms).slideY(begin: .1, end: 0),
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.workspace_premium_rounded, color: C.gold, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text.rich(TextSpan(style: T.body(15, color: C.inkSoft), children: [
              TextSpan(text: state == StageState.won ? 'Dein Titel von hier: ' : 'Ein Sieg macht dich zum '),
              TextSpan(text: stage.title, style: T.body(15, color: C.goldSoft, weight: FontWeight.w800)),
            ])),
          ),
        ]),
        const SizedBox(height: 20),
        if (locked)
          Panel(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(children: [
              const Icon(Icons.lock_rounded, color: C.inkMute),
              const SizedBox(width: 10),
              Expanded(child: Text('Gewinne zuerst Station ${stage.level - 1}, um hier anzutreten.', style: T.body(15, color: C.inkSoft))),
            ]),
          )
        else
          GoldButton(
            label: state == StageState.won ? 'Erneut antreten' : 'Antreten',
            icon: Icons.play_arrow_rounded,
            large: true,
            onPressed: () => Navigator.pop(context, true),
          ),
      ]),
    );
  }
}
