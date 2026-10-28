import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../api.dart';
import '../game/models.dart';
import '../game/progress.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/playing_card.dart';
import 'campaign_screen.dart';
import 'courts_screen.dart';
import 'decks_screen.dart';
import 'gallery_screen.dart';
import 'game_screen.dart';
import 'tutorial_screen.dart';
import '../widgets/jakob_icons.dart';

/// The court: start or join a table, invitations, open tables and the solo modes.
class HomeScreen extends StatefulWidget {
  final void Function(int) onRequests;
  final void Function(String) onUsername;
  const HomeScreen({super.key, required this.onRequests, required this.onUsername});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map? _data;
  String? _error;
  String? _starting;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final res = await Api.get('home');
    if (!mounted) return;
    setState(() {
      if (res.ok) {
        _data = res.data as Map;
        _error = null;
      } else {
        _error = res.error;
      }
    });
    if (res.ok) {
      widget.onRequests((_data!['friendRequests'] as num?)?.toInt() ?? 0);
      final u = (_data!['profile'] as Map?)?['username'] as String?;
      if (u != null) widget.onUsername(u);
    }
  }

  Future<void> _start(String kind, [Map<String, dynamic> extra = const {}]) async {
    setState(() => _starting = kind);
    final res = await Api.post('table', {'kind': kind, ...extra});
    if (!mounted) return;
    setState(() => _starting = null);
    if (!res.ok) return toast(context, res.error!, error: true);
    await openTable(context, (res.data as Map)['code'] as String);
    _load();
  }

  Future<void> _askCode() async {
    final ctrl = TextEditingController();
    final code = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(22, 4, 22, MediaQuery.viewInsetsOf(ctx).bottom + 26),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Tisch beitreten', style: T.display(30)),
          const SizedBox(height: 6),
          Text('Den Code zeigt dir, wer den Tisch eröffnet hat.', style: T.body(15, color: C.inkSoft)),
          const SizedBox(height: 18),
          TextField(
            controller: ctrl, autofocus: true, textCapitalization: TextCapitalization.characters, maxLength: 6,
            textAlign: TextAlign.center, style: T.body(34, color: C.goldSoft, weight: FontWeight.w800).copyWith(letterSpacing: 8),
            decoration: const InputDecoration(hintText: 'ABC123', counterText: ''),
            onSubmitted: (v) => Navigator.pop(ctx, v),
          ),
          const SizedBox(height: 16),
          GoldButton(label: 'Beitreten', icon: Icons.login_rounded, onPressed: () => Navigator.pop(ctx, ctrl.text)),
        ]),
      ),
    );
    if (code != null && code.trim().isNotEmpty) _start('join', {'code': code.trim().toUpperCase()});
  }

  Future<void> _respondInvite(Map invite, bool accept) async {
    final res = await Api.post('friends', {'op': 'invite', 'id': invite['id'], 'accept': accept});
    if (!mounted) return;
    if (!res.ok) return toast(context, res.error!, error: true);
    final code = (res.data as Map?)?['code'] as String?;
    if (accept && code != null) {
      await openTable(context, code);
    }
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final d = _data;
    final profile = d?['profile'] as Map?;
    final name = profile?['username'] as String? ?? '';
    final rating = d?['rating'] as Map?;
    final xp = (rating?['xp'] as num?)?.toInt() ?? 0;
    final elo = (rating?['rating'] as num?)?.toInt() ?? 1000;
    final level = levelFromXp(xp);
    final invites = (d?['invites'] as List?) ?? const [];
    final active = (d?['active'] as List?) ?? const [];
    final campaign = d?['campaign'] as Map?;
    final daily = d?['daily'] as Map?;
    final lobby = d?['lobby'] as Map?;
    final king = d?['king'] as Map?;

    return Backdrop(
      child: RefreshIndicator(
        color: C.gold,
        backgroundColor: C.surface,
        onRefresh: _load,
        child: ListView(
          padding: EdgeInsets.fromLTRB(18, MediaQuery.paddingOf(context).top + 14, 18, 120),
          children: [
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(_greeting(), style: T.body(16, color: C.inkSoft)),
                  Text(name.isEmpty ? 'Der Große Jakob' : name, style: T.display(36), overflow: TextOverflow.ellipsis),
                ]),
              ),
              if (profile != null) Avatar(name: name, url: profile['avatar_url'] as String?, size: 52, ring: C.gold),
            ]),
            if (d != null) ...[
              const SizedBox(height: 10),
              Wrap(spacing: 8, runSpacing: 8, children: [
                Pill('Stufe $level · ${levelTitle(level)}', jicon: 'star', textColor: C.goldSoft),
                Pill('$elo Elo', jicon: tierFor(elo).icon, color: tierFor(elo).color.withValues(alpha: .22)),
              ]),
            ],
            const SizedBox(height: 20),
            _Hero(
              starting: _starting,
              waiting: (lobby?['waiting'] as num?)?.toInt() ?? 0,
              onNew: () => _start('new'),
              onOnline: () => _start('online'),
              onCode: _askCode,
            ),
            if (_error != null) ...[const SizedBox(height: 14), EmptyNote(_error!, icon: Icons.wifi_off_rounded)],
            if (invites.isNotEmpty) ...[
              const SectionTitle('Einladungen'),
              for (final inv in invites)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Panel(
                    glow: true,
                    child: Row(children: [
                      Avatar.of(Profile.from(inv['from'] as Map), size: 44),
                      const SizedBox(width: 12),
                      Expanded(child: Text('${(inv['from'] as Map)['username']} lädt dich an den Tisch ${inv['gameCode']} ein', style: T.body(16))),
                      IconButton(onPressed: () => _respondInvite(inv as Map, false), icon: const Icon(Icons.close_rounded, color: C.inkSoft)),
                      IconButton.filled(
                        style: IconButton.styleFrom(backgroundColor: C.gold),
                        onPressed: () => _respondInvite(inv, true),
                        icon: const Icon(Icons.check_rounded, color: C.onGold),
                      ),
                    ]),
                  ),
                ).animate().fadeIn().slideX(begin: .05),
            ],
            if (active.isNotEmpty) ...[
              const SectionTitle('Deine offenen Tische'),
              for (final g in active)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Panel(
                    onTap: () async {
                      await openTable(context, g['code'] as String);
                      _load();
                    },
                    child: Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(color: C.night, borderRadius: BorderRadius.circular(12), border: Border.all(color: C.line)),
                        child: Text(g['code'] as String, style: T.body(18, color: C.goldSoft, weight: FontWeight.w800).copyWith(letterSpacing: 2)),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          '${g['status'] == 'lobby' ? 'Lobby' : 'Runde ${g['round']}'} · ${g['playerCount']} am Tisch',
                          style: T.body(16),
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: C.inkSoft),
                    ]),
                  ),
                ),
            ],
            const SectionTitle('Allein am Hof'),
            _ModeTile(
              icon: 'ladder',
              title: 'Kampagne',
              text: campaign == null ? 'Vom Bauern zum König' : 'Dein Titel: ${campaign['title']} · Station ${math.min(((campaign['level'] as num?) ?? 0).toInt() + 1, ((campaign['stages'] as num?) ?? 8).toInt())} von ${campaign['stages']}',
              onTap: () async {
                await Navigator.push(context, MaterialPageRoute(builder: (_) => const CampaignScreen()));
                _load();
              },
            ),
            const SizedBox(height: 10),
            _ModeTile(
              icon: 'calendar',
              title: 'Tägliche Herausforderung',
              text: daily != null ? 'Heute erledigt: ${daily['points']} Punkte' : 'Dieselbe Hand für alle. Heute noch offen.',
              done: daily != null,
              busy: _starting == 'daily',
              onTap: daily != null ? null : () => _start('daily'),
            ),
            const SizedBox(height: 10),
            _ModeTile(
              icon: 'cards',
              title: 'Deine Decks',
              text: 'Wähle, mit welchem Deck du an den Tisch kommst.',
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DecksScreen())),
            ),
            const SectionTitle('Am Hof'),
            _ModeTile(
              icon: 'castle',
              title: 'Höfe',
              text: 'Deine feste Runde mit Wappen und eigener Tabelle.',
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CourtsScreen())),
            ),
            const SizedBox(height: 10),
            _ModeTile(
              icon: 'image',
              title: 'Deck-Galerie',
              text: 'Decks anderer Spieler ansehen, liken und kopieren.',
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const GalleryScreen())),
            ),
            const SizedBox(height: 10),
            _ModeTile(
              icon: 'book',
              title: 'Spielen lernen',
              text: 'Sieben kurze Lektionen, Schritt für Schritt.',
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TutorialScreen())),
            ),
            if (king != null) ...[
              const SectionTitle('König der Woche'),
              Panel(
                glow: true,
                child: Row(children: [
                  Stack(clipBehavior: Clip.none, alignment: Alignment.topCenter, children: [
                    Avatar(name: king['username'] as String? ?? '?', url: king['avatar_url'] as String?, size: 56, ring: C.gold),
                    const Positioned(top: -22, child: JIcon('crown', size: 28, color: C.gold)),
                  ]),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(king['user_id'] == profile?['id'] ? 'Du!' : king['username'] as String? ?? '', style: T.display(26)),
                      Text('${king['wins']} ${king['wins'] == 1 ? 'Sieg' : 'Siege'} in 7 Tagen unter dir und deinen Freunden', style: T.body(14, color: C.inkSoft)),
                    ]),
                  ),
                ]),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 5) return 'Noch wach, Majestät?';
    if (h < 11) return 'Guten Morgen';
    if (h < 18) return 'Willkommen am Hof';
    return 'Guten Abend';
  }
}

class _Hero extends StatelessWidget {
  final String? starting;
  final int waiting;
  final VoidCallback onNew, onOnline, onCode;
  const _Hero({required this.starting, required this.waiting, required this.onNew, required this.onOnline, required this.onCode});

  @override
  Widget build(BuildContext context) {
    return Panel(
      padding: const EdgeInsets.fromLTRB(18, 22, 18, 18),
      child: Column(children: [
        SizedBox(
          height: 120,
          child: Stack(alignment: Alignment.bottomCenter, children: [
            for (var i = 0; i < 5; i++)
              Transform.translate(
                offset: Offset((i - 2) * 30.0, (i - 2).abs() * 6.0),
                child: Transform.rotate(angle: (i - 2) * .16, child: const CardBack(width: 64)),
              )
                  .animate(delay: (i * 90).ms)
                  .fadeIn(duration: 400.ms)
                  .moveY(begin: 30, end: 0, curve: Curves.easeOutBack, duration: 600.ms),
            const Positioned(top: 0, child: JIcon('crown', size: 40, color: C.gold))
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .moveY(begin: -3, end: 3, duration: 1600.ms, curve: Curves.easeInOut),
          ]),
        ),
        const SizedBox(height: 18),
        GoldButton(label: 'Neuen Tisch eröffnen', icon: Icons.add_rounded, large: true, busy: starting == 'new', onPressed: onNew),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: SoftButton(label: waiting > 0 ? 'Online · $waiting warten' : 'Online spielen', jicon: 'globe', onPressed: starting == null ? onOnline : null)),
          const SizedBox(width: 10),
          Expanded(child: SoftButton(label: 'Code', jicon: 'hash', onPressed: onCode)),
        ]),
      ]),
    );
  }
}

class _ModeTile extends StatelessWidget {
  final String icon, title, text;
  final VoidCallback? onTap;
  final bool done, busy;
  const _ModeTile({required this.icon, required this.title, required this.text, this.onTap, this.done = false, this.busy = false});

  @override
  Widget build(BuildContext context) => Panel(
        onTap: onTap,
        child: Row(children: [
          Container(
            width: 52, height: 52, alignment: Alignment.center,
            decoration: BoxDecoration(color: C.night, borderRadius: BorderRadius.circular(16), border: Border.all(color: C.line)),
            child: JIcon(icon, size: 28, color: C.goldSoft),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: T.display(22)),
              const SizedBox(height: 2),
              Text(text, style: T.body(14, color: done ? C.vert : C.inkSoft)),
            ]),
          ),
          if (busy)
            const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: C.gold))
          else if (onTap != null)
            const Icon(Icons.chevron_right_rounded, color: C.inkSoft)
          else if (done)
            const Icon(Icons.check_circle_rounded, color: C.vert),
        ]),
      );
}
