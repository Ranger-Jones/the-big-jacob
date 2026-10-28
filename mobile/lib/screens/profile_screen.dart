import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'decks_screen.dart';
import 'profile/profile_widgets.dart';

/// A player's court record: rating, numbers, charts, badges, rivals and recent games.
/// As the own tab (isMe) it also offers the decks and signing out.
class ProfileScreen extends StatefulWidget {
  final String username;
  final bool isMe;
  const ProfileScreen({super.key, required this.username, this.isMe = false});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map? _data;
  String? _error;
  bool _loading = false;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(ProfileScreen old) {
    super.didUpdateWidget(old);
    if (old.username != widget.username) {
      _data = null;
      _error = null;
      _load();
    }
  }

  Future<void> _load() async {
    final name = widget.username.trim();
    if (name.isEmpty) return;
    // Ignore answers to requests that a newer username superseded.
    final request = ++_request;
    setState(() => _loading = true);
    final res = await Api.get('profile/${Uri.encodeComponent(name)}');
    if (!mounted || request != _request) return;
    setState(() {
      _loading = false;
      if (res.ok && res.data is Map) {
        _data = res.data as Map;
        _error = null;
      } else {
        _error = res.error ?? 'Profil nicht gefunden.';
      }
    });
  }

  void _open(String username) {
    if (username.isEmpty || username == widget.username) return;
    Navigator.push(context, MaterialPageRoute(builder: (_) => ProfileScreen(username: username)));
  }

  Future<void> _signOut() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Abmelden?', style: T.display(30)),
        content: Text('Du kannst dich jederzeit wieder anmelden.', style: T.body(16, color: C.inkSoft)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Bleiben', style: T.body(16, color: C.inkSoft, weight: FontWeight.w700))),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text('Abmelden', style: T.body(16, color: C.wax, weight: FontWeight.w800))),
        ],
      ),
    );
    if (yes != true) return;
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {
      if (mounted) toast(context, 'Abmelden hat nicht geklappt. Bitte nochmal versuchen.', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final body = Backdrop(
      child: RefreshIndicator(
        color: C.gold,
        backgroundColor: C.surface,
        edgeOffset: top,
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.fromLTRB(18, top + (widget.isMe ? 14 : 4), 18, widget.isMe ? 120 : 40),
          children: _content(),
        ),
      ),
    );
    if (widget.isMe) return body;
    return Scaffold(backgroundColor: C.night, body: body);
  }

  List<Widget> _content() {
    final d = _data;
    final topBar = SizedBox(
      height: 48,
      child: Row(children: [
        if (!widget.isMe)
          IconButton(
            tooltip: 'Zurück',
            style: IconButton.styleFrom(backgroundColor: C.surface.withValues(alpha: .7), fixedSize: const Size(48, 48)),
            onPressed: () => Navigator.maybePop(context),
            icon: const Icon(Icons.arrow_back_rounded, color: C.ink),
          ),
        const Spacer(),
        if (widget.isMe)
          IconButton(
            tooltip: 'Abmelden',
            style: IconButton.styleFrom(backgroundColor: C.surface.withValues(alpha: .7), fixedSize: const Size(48, 48)),
            onPressed: _signOut,
            icon: const Icon(Icons.logout_rounded, color: C.inkSoft),
          ),
      ]),
    );

    if (d == null) {
      return [
        topBar,
        const SizedBox(height: 8),
        if (_error != null) ...[
          EmptyNote(_error!, icon: Icons.wifi_off_rounded),
          SoftButton(label: 'Nochmal versuchen', icon: Icons.refresh_rounded, onPressed: _load),
        ] else if (_loading || widget.username.trim().isNotEmpty)
          const ProfileSkeleton()
        else
          const EmptyNote('Dein Profil wird geladen …'),
        if (widget.isMe) ...[const SizedBox(height: 24), ..._account()],
      ];
    }

    final stats = d['stats'] as Map? ?? const {};
    final rating = d['rating'] as Map?;
    final titles = (d['titles'] as List?)?.map((e) => '$e').toList() ?? const <String>[];
    final badges = (d['badges'] as List?)?.whereType<Map>().toList() ?? const <Map>[];
    final rivals = (d['rivals'] as List?)?.whereType<Map>().toList() ?? const <Map>[];
    final history = (d['history'] as List?)?.whereType<Map>().toList() ?? const <Map>[];
    final detailed = d['detailed'] as Map?;
    final earned = badges.where((b) => b['earned'] == true).length;
    final userId = stats['user_id'] as String? ?? '';

    return [
      topBar,
      ProfileHeader(stats: stats, titles: titles, elo: asInt(rating?['rating'] ?? 1000)),
      const SizedBox(height: 22),
      RatingPanel(rating: rating),
      const SizedBox(height: 12),
      StatTiles(stats: stats),
      if (detailed != null) DetailedStatsBlock(detailed: detailed, isMe: widget.isMe),
      if (widget.isMe) ...[
        const SectionTitle('Am Hof'),
        Panel(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DecksScreen())),
          child: Row(children: [
            Container(
              width: 52, height: 52, alignment: Alignment.center,
              decoration: BoxDecoration(color: C.night, borderRadius: BorderRadius.circular(16), border: Border.all(color: C.line)),
              child: const Text('🎴', style: TextStyle(fontSize: 26)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Deine Decks', style: T.display(22)),
                const SizedBox(height: 2),
                Text('Wähle und gestalte die Karten, mit denen du spielst.', style: T.body(14, color: C.inkSoft)),
              ]),
            ),
            const Icon(Icons.chevron_right_rounded, color: C.inkSoft),
          ]),
        ),
      ],
      SectionTitle('Abzeichen', trailing: Pill('$earned von ${badges.length}', textColor: C.goldSoft)),
      BadgeGrid(badges: badges),
      if (rivals.isNotEmpty) ...[
        const SectionTitle('Rivalitäten'),
        RivalList(rivals: rivals, onOpen: _open),
      ],
      const SectionTitle('Letzte Spiele'),
      if (history.isEmpty)
        Panel(
          child: EmptyNote(
            widget.isMe ? 'Noch keine Spiele. Eröffne einen Tisch am Hof.' : 'Noch keine beendeten Spiele.',
            icon: Icons.style_rounded,
          ),
        )
      else
        HistoryList(games: history, userId: userId, onOpen: _open),
      if (widget.isMe) ...[const SizedBox(height: 28), ..._account()],
    ];
  }

  List<Widget> _account() => [
        SoftButton(label: 'Abmelden', icon: Icons.logout_rounded, danger: true, onPressed: _signOut),
      ];
}
