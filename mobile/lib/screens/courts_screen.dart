import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../api.dart';
import '../i18n/i18n.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'courts/court_detail_screen.dart';
import 'courts/court_forms.dart';
import 'courts/court_models.dart';
import 'courts/crest.dart';

/// "Höfe": the user's fixed rounds (WG, Wache, Stammtisch), plus joining and founding new ones.
class CourtsScreen extends StatefulWidget {
  /// Optional invite code to prefill the join form, e.g. from a shared link.
  final String? code;
  const CourtsScreen({super.key, this.code});

  @override
  State<CourtsScreen> createState() => _CourtsScreenState();
}

class _CourtsScreenState extends State<CourtsScreen> {
  List<CourtSummary>? _courts;
  List<String> _crests = const [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final res = await Api.get('courts');
    if (!mounted) return;
    setState(() {
      if (res.ok) {
        final d = res.data as Map;
        _courts = ((d['courts'] as List?) ?? const []).whereType<Map>().map(CourtSummary.from).toList();
        _crests = crestIds(d['crests']);
        _error = null;
      } else {
        _error = res.error;
      }
    });
  }

  Future<void> _open(String id) async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => CourtDetailScreen(id: id)));
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final courts = _courts;
    return Backdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          foregroundColor: C.ink,
          title: Text(t('Höfe'), style: T.display(30)),
        ),
        body: RefreshIndicator(
          color: C.gold,
          backgroundColor: C.surface,
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: EdgeInsets.fromLTRB(18, 0, 18, MediaQuery.paddingOf(context).bottom + 32),
            children: [
              Text(
                t('Ein Hof ist deine feste Runde: WG, Wache, Stammtisch. Er bekommt ein Wappen und eine eigene Tabelle, in die jedes Spiel zählt, an dem mindestens zwei Mitglieder teilnehmen.'),
                style: T.body(16, color: C.inkSoft, height: 1.4),
              ).animate().fadeIn(duration: 320.ms),
              if (courts == null && _error == null)
                const Padding(padding: EdgeInsets.symmetric(vertical: 60), child: Center(child: CircularProgressIndicator(color: C.gold)))
              else if (courts == null)
                Padding(padding: const EdgeInsets.only(top: 18), child: EmptyNote(_error!, icon: Icons.wifi_off_rounded))
              else ...[
                if (courts.isNotEmpty) ...[
                  SectionTitle(t('Deine Höfe'), trailing: Text('${courts.length} / $maxCourts', style: T.display(22, color: C.gold))),
                  for (var i = 0; i < courts.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _CourtTile(court: courts[i], onTap: () => _open(courts[i].id)),
                    ).animate(delay: (60 * i).ms).fadeIn(duration: 320.ms).slideY(begin: .12, end: 0, curve: Curves.easeOutCubic),
                ],
                const SizedBox(height: 14),
                if (courts.length < maxCourts) ...[
                  JoinCourtPanel(initialCode: widget.code ?? '', onJoined: _open)
                      .animate(delay: (60 * courts.length + 60).ms)
                      .fadeIn(duration: 320.ms)
                      .slideY(begin: .08, end: 0, curve: Curves.easeOutCubic),
                  const SizedBox(height: 14),
                  CreateCourtPanel(crests: _crests, first: courts.isEmpty, onCreated: _open)
                      .animate(delay: (60 * courts.length + 120).ms)
                      .fadeIn(duration: 320.ms)
                      .slideY(begin: .08, end: 0, curve: Curves.easeOutCubic),
                ] else
                  Panel(
                    child: EmptyNote(
                      t('Du bist in {n} Höfen, mehr geht nicht. Verlasse einen, um einem neuen beizutreten oder einen zu gründen.', {'n': maxCourts}),
                      icon: Icons.shield_outlined,
                    ),
                  ).animate().fadeIn(duration: 320.ms),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _CourtTile extends StatelessWidget {
  final CourtSummary court;
  final VoidCallback onTap;
  const _CourtTile({required this.court, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final members = memberCount(court.members);
    return Panel(
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(14, 14, 10, 14),
      child: Row(children: [
        Crest(id: court.crest, size: 62),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(court.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: T.display(28)),
            const SizedBox(height: 4),
            Text.rich(
              TextSpan(children: [
                TextSpan(text: members),
                if (court.owner) ...[
                  const TextSpan(text: ' · '),
                  TextSpan(text: t('du bist Hofherr'), style: T.body(15, color: C.goldSoft, weight: FontWeight.w700)),
                ],
              ]),
              style: T.body(15, color: C.inkSoft),
            ),
          ]),
        ),
        const Icon(Icons.chevron_right_rounded, color: C.inkMute),
      ]),
    );
  }
}
