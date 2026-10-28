import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../api.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/jakob_icons.dart';
import 'game_screen.dart';

/// A character from the bot gallery (served by GET /api/app/bots, defined in src/lib/jakob/personas.ts).
class BotPersona {
  final String id, name, title, bio, greeting;
  final int elo, played, won;
  final String? openCode;
  const BotPersona(this.id, this.name, this.title, this.bio, this.greeting, this.elo, this.played, this.won, this.openCode);

  factory BotPersona.from(Map m) => BotPersona(
        m['id'] as String, m['name'] as String, m['title'] as String? ?? '', m['bio'] as String? ?? '',
        m['greeting'] as String? ?? '', (m['elo'] as num?)?.toInt() ?? 1000, (m['played'] as num?)?.toInt() ?? 0,
        (m['won'] as num?)?.toInt() ?? 0, m['openCode'] as String?,
      );

  /// Same groups as personaTier() on the web.
  String get tier => elo >= 1300 ? 'Königlich' : elo >= 1200 ? 'Meister' : elo >= 1100 ? 'Fortgeschritten' : 'Anfänger';
}

class DuelVariant {
  final String id, name, description;
  const DuelVariant(this.id, this.name, this.description);
  factory DuelVariant.from(Map m) => DuelVariant(m['id'] as String, m['name'] as String, m['description'] as String? ?? '');
}

const tiers = ['Anfänger', 'Fortgeschritten', 'Meister', 'Königlich'];
const _tierHint = {
  'Anfänger': 'Zum Warmwerden – sie machen noch Fehler.',
  'Fortgeschritten': 'Solide Spieler mit eigenem Stil.',
  'Meister': 'Zählen Karten und planen voraus.',
  'Königlich': 'Rechnen jede Runde durch. Viel Glück.',
};

/// The drawn portrait of a bot (same art as at the table).
class BotPortrait extends StatelessWidget {
  final String name;
  final double size;
  final bool highlight;
  const BotPortrait(this.name, {super.key, this.size = 64, this.highlight = false});

  @override
  Widget build(BuildContext context) => Container(
        width: size, height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: highlight ? C.gold : C.goldDeep, width: size > 90 ? 5 : 3),
          boxShadow: highlight ? [BoxShadow(color: C.gold.withValues(alpha: .35), blurRadius: 20)] : null,
        ),
        clipBehavior: Clip.antiAlias,
        child: SvgPicture.network(Api.artUrl(botArtId(name), full: false), fit: BoxFit.cover,
            placeholderBuilder: (_) => const ColoredBox(color: C.surfaceHi)),
      );
}

/// "Gegen Bots spielen": every character of the court, weakest first, with the player's record.
class BotsScreen extends StatefulWidget {
  const BotsScreen({super.key});

  @override
  State<BotsScreen> createState() => _BotsScreenState();
}

class _BotsScreenState extends State<BotsScreen> {
  List<BotPersona> _bots = const [];
  List<DuelVariant> _variants = const [];
  String? _error;
  bool _loaded = false, _starting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final res = await Api.get('bots');
    if (!mounted) return;
    setState(() {
      _loaded = true;
      if (!res.ok) {
        _error = res.error;
        return;
      }
      final d = res.data as Map;
      _bots = ((d['bots'] as List?) ?? const []).whereType<Map>().map(BotPersona.from).toList();
      _variants = ((d['variants'] as List?) ?? const []).whereType<Map>().map(DuelVariant.from).toList();
      _error = null;
    });
  }

  Future<void> _open(BotPersona bot) async {
    final variant = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _BotSheet(bot: bot, variants: _variants),
    );
    if (variant == null || !mounted || _starting) return;
    setState(() => _starting = true);
    final res = await Api.post('table', {'kind': 'duel', 'persona': bot.id, 'variant': variant});
    if (!mounted) return;
    setState(() => _starting = false);
    if (!res.ok) return toast(context, res.error!, error: true);
    await openTable(context, (res.data as Map)['code'] as String);
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final beaten = _bots.where((b) => b.won > 0).length;
    return Backdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          foregroundColor: C.ink,
          title: Text('Gegen Bots spielen', style: T.display(28)),
        ),
        body: !_loaded
            ? const Center(child: CircularProgressIndicator(color: C.gold))
            : RefreshIndicator(
                color: C.gold,
                backgroundColor: C.surface,
                onRefresh: _load,
                child: ListView(
                  padding: EdgeInsets.fromLTRB(18, 0, 18, MediaQuery.paddingOf(context).bottom + 30),
                  children: [
                    Text('Fordere die Leute vom Hof zum Duell: zu zweit, mit je 15 Karten und einem verdeckten Hofstapel. '
                        'Jeder spielt anders – und ganz oben wartet der König.', style: T.body(15, color: C.inkSoft, height: 1.35)),
                    const SizedBox(height: 12),
                    Align(alignment: Alignment.centerLeft, child: Pill('$beaten von ${_bots.length} besiegt', jicon: 'trophy', textColor: C.goldSoft)),
                    if (_error != null) EmptyNote(_error!, icon: Icons.wifi_off_rounded),
                    if (_starting) const Padding(padding: EdgeInsets.only(top: 12), child: LinearProgressIndicator(color: C.gold, backgroundColor: C.surface)),
                    for (final tier in tiers)
                      if (_bots.any((b) => b.tier == tier)) ...[
                        SectionTitle(tier),
                        Transform.translate(offset: const Offset(0, -8), child: Text(_tierHint[tier]!, style: T.body(14, color: C.inkSoft))),
                        GridView.count(
                          crossAxisCount: 3,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                          childAspectRatio: .74,
                          children: [
                            for (final (i, b) in _bots.where((b) => b.tier == tier).indexed)
                              _BotTile(bot: b, onTap: () => _open(b)).animate().fadeIn(delay: (i * 50).ms).scaleXY(begin: .94, end: 1),
                          ],
                        ),
                      ],
                  ],
                ),
              ),
      ),
    );
  }
}

class _BotTile extends StatelessWidget {
  final BotPersona bot;
  final VoidCallback onTap;
  const _BotTile({required this.bot, required this.onTap});

  @override
  Widget build(BuildContext context) => Panel(
        padding: const EdgeInsets.fromLTRB(6, 12, 6, 8),
        onTap: onTap,
        glow: bot.openCode != null,
        child: Column(children: [
          Stack(clipBehavior: Clip.none, children: [
            BotPortrait(bot.name, size: 66),
            if (bot.won > 0)
              Positioned(right: -4, bottom: -2, child: _Badge(color: C.vert, child: const JIcon('check', size: 14, color: C.ink))),
            if (bot.openCode != null)
              Positioned(left: -4, top: -4, child: _Badge(color: C.gold, child: const JIcon('hourglass', size: 13, color: C.onGold))),
          ]),
          const SizedBox(height: 8),
          Expanded(
            child: Text(bot.name, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
                style: T.body(13, weight: FontWeight.w800, height: 1.15)),
          ),
          Text('${bot.elo}', style: T.label(13, color: C.goldSoft)),
        ]),
      );
}

class _Badge extends StatelessWidget {
  final Color color;
  final Widget child;
  const _Badge({required this.color, required this.child});

  @override
  Widget build(BuildContext context) => Container(
        width: 24, height: 24, alignment: Alignment.center,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle, border: Border.all(color: C.velvet, width: 2)),
        child: child,
      );
}

/// Profile of one bot with the rule-set choice; resolves to the chosen variant id.
class _BotSheet extends StatefulWidget {
  final BotPersona bot;
  final List<DuelVariant> variants;
  const _BotSheet({required this.bot, required this.variants});

  @override
  State<_BotSheet> createState() => _BotSheetState();
}

class _BotSheetState extends State<_BotSheet> {
  late String _variant = widget.variants.isNotEmpty ? widget.variants.first.id : 'klassisch';

  @override
  Widget build(BuildContext context) {
    final bot = widget.bot;
    final running = bot.openCode != null;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.paddingOf(context).bottom + 24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Center(child: BotPortrait(bot.name, size: 116, highlight: true)).animate().scaleXY(begin: .8, end: 1, duration: 380.ms, curve: Curves.easeOutBack),
        const SizedBox(height: 12),
        Text(bot.name, textAlign: TextAlign.center, style: T.display(34)),
        const SizedBox(height: 6),
        Center(child: Pill('${bot.tier} · ${bot.elo} Elo', color: const Color(0xFF6B1E2E), textColor: C.ink)),
        const SizedBox(height: 14),
        Panel(
          color: C.velvet,
          child: Text('„${bot.greeting}“', textAlign: TextAlign.center, style: T.body(18, weight: FontWeight.w800).copyWith(fontStyle: FontStyle.italic)),
        ).animate(delay: 120.ms).fadeIn().slideY(begin: .15, end: 0),
        const SizedBox(height: 10),
        Text(bot.bio, textAlign: TextAlign.center, style: T.body(15, color: C.inkSoft, height: 1.35)),
        const SizedBox(height: 6),
        Text(
          bot.played == 0 ? 'Noch nie gegeneinander gespielt' : 'Deine Bilanz: ${bot.won} ${bot.won == 1 ? 'Sieg' : 'Siege'} aus ${bot.played} ${bot.played == 1 ? 'Duell' : 'Duellen'}',
          textAlign: TextAlign.center,
          style: T.label(13, color: bot.won > 0 ? C.vert : C.inkSoft),
        ),
        const SizedBox(height: 18),
        if (!running) ...[
          Text('Spielart', style: T.body(16, weight: FontWeight.w800)),
          const SizedBox(height: 8),
          for (final v in widget.variants)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Panel(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                color: _variant == v.id ? const Color(0xFF4A1A2E) : null,
                glow: _variant == v.id,
                onTap: () => setState(() => _variant = v.id),
                child: Row(children: [
                  Icon(_variant == v.id ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded, color: _variant == v.id ? C.gold : C.inkMute, size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(v.name, style: T.body(16, weight: FontWeight.w800)),
                      Text(v.description, style: T.body(13, color: C.inkSoft, height: 1.3)),
                    ]),
                  ),
                ]),
              ),
            ),
          const SizedBox(height: 8),
        ],
        GoldButton(
          label: running ? 'Duell fortsetzen' : 'Duell beginnen',
          jicon: 'sword',
          large: true,
          onPressed: () => Navigator.pop(context, _variant),
        ),
      ]),
    );
  }
}

/// Lobby: pick a character to seat; resolves to its id. Already seated ones are greyed out.
Future<String?> showPersonaPicker(BuildContext context, Set<String> seated) => showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: .75,
        maxChildSize: .95,
        builder: (ctx, scroll) => FutureBuilder(
          future: Api.get('bots'),
          builder: (ctx, snap) {
            if (!snap.hasData) return const Center(child: CircularProgressIndicator(color: C.gold));
            final res = snap.data!;
            if (!res.ok) return EmptyNote(res.error!, icon: Icons.wifi_off_rounded);
            final bots = (((res.data as Map)['bots'] as List?) ?? const []).whereType<Map>().map(BotPersona.from).toList();
            return ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(20, 0, 20, 40), children: [
              Text('Charakter an den Tisch holen', style: T.display(28)),
              for (final tier in tiers) ...[
                SectionTitle(tier),
                for (final b in bots.where((b) => b.tier == tier))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Opacity(
                      opacity: seated.contains(b.id) ? .45 : 1,
                      child: Panel(
                        padding: const EdgeInsets.all(10),
                        onTap: seated.contains(b.id) ? null : () => Navigator.pop(ctx, b.id),
                        child: Row(children: [
                          BotPortrait(b.name, size: 48),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(b.name, style: T.body(16, weight: FontWeight.w800)),
                              Text(seated.contains(b.id) ? 'sitzt schon da' : b.bio, maxLines: 1, overflow: TextOverflow.ellipsis, style: T.body(13, color: C.inkSoft)),
                            ]),
                          ),
                          Text('${b.elo}', style: T.label(14, color: C.goldSoft)),
                        ]),
                      ),
                    ),
                  ),
              ],
            ]);
          },
        ),
      ),
    );
