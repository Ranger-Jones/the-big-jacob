import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../api.dart';
import '../game/models.dart';
import '../i18n/i18n.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'campaign_screen.dart';
import 'tutorial/default_deck.dart';
import 'tutorial/lesson_flow.dart';

/// "Spielen lernen": seven interactive lessons, checked by the real rules, then on to the campaign.
class TutorialScreen extends StatefulWidget {
  const TutorialScreen({super.key});

  @override
  State<TutorialScreen> createState() => _TutorialScreenState();
}

class _TutorialScreenState extends State<TutorialScreen> {
  Deck? _deck;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final res = await Api.get('decks');
    if (!mounted) return;
    final deck = res.ok ? defaultDeckFrom(res.data) : null;
    setState(() {
      _loading = false;
      _deck = deck;
      _error = res.ok ? (deck == null ? t('Kein Kartendeck gefunden.') : null) : res.error;
    });
  }

  void _toCampaign() =>
      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => const CampaignScreen()));

  @override
  Widget build(BuildContext context) {
    final deck = _deck;
    return Backdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          foregroundColor: C.ink,
          leading: BackButton(onPressed: () => Navigator.maybePop(context)),
          title: Text(t('Spielen lernen'), style: T.display(30)),
        ),
        body: _loading
            ? Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const CircularProgressIndicator(color: C.gold),
                  const SizedBox(height: 16),
                  Text(t('Die Karten werden gemischt …'), style: T.body(16, color: C.inkSoft)),
                ]).animate().fadeIn(duration: 300.ms),
              )
            : deck == null
                ? Padding(
                    padding: const EdgeInsets.all(22),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      EmptyNote(t(_error ?? 'Kein Kartendeck gefunden.'), icon: Icons.wifi_off_rounded),
                      SoftButton(label: t('Nochmal versuchen'), icon: Icons.refresh_rounded, onPressed: _load),
                    ]),
                  )
                : LessonFlow(deck: deck, onCampaign: _toCampaign).animate().fadeIn(duration: 260.ms),
      ),
    );
  }
}
