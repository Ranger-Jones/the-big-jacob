import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/jakob_icons.dart';

/// Shown after the last lesson: on to the campaign for practice against bots.
class FinishCard extends StatelessWidget {
  final VoidCallback onCampaign;
  final VoidCallback onRestart;
  const FinishCard({super.key, required this.onCampaign, required this.onRestart});

  @override
  Widget build(BuildContext context) => Panel(
        glow: true,
        padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Center(child: JIcon('crown', size: 72, color: C.gold))
              .animate()
              .scaleXY(begin: .3, end: 1, duration: 520.ms, curve: Curves.easeOutBack)
              .rotate(begin: -.06, end: 0, duration: 520.ms),
          const SizedBox(height: 8),
          Text(t('Geschafft!'), textAlign: TextAlign.center, style: T.display(48, color: C.goldSoft))
              .animate()
              .fadeIn(delay: 120.ms, duration: 300.ms)
              .scaleXY(begin: 1.25, end: 1, delay: 120.ms, duration: 380.ms, curve: Curves.easeOutCubic),
          const SizedBox(height: 10),
          Text(
            t('Du kennst jetzt die Regeln am Hof. In der Kampagne übst du sie gegen Bots, Station für Station.'),
            textAlign: TextAlign.center,
            style: T.body(17, color: C.inkSoft, height: 1.4),
          ).animate().fadeIn(delay: 260.ms, duration: 320.ms),
          const SizedBox(height: 22),
          GoldButton(label: t('Zur Kampagne'), icon: Icons.flag_rounded, large: true, onPressed: onCampaign)
              .animate()
              .fadeIn(delay: 380.ms, duration: 300.ms)
              .slideY(begin: .25, end: 0, delay: 380.ms, duration: 340.ms, curve: Curves.easeOutCubic),
          const SizedBox(height: 10),
          SoftButton(label: t('Lektionen wiederholen'), icon: Icons.replay_rounded, onPressed: onRestart),
        ]),
      );
}
