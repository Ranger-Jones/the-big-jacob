import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'decks_screen.dart';
import 'profile/profile_edit.dart';
import 'profile/profile_widgets.dart';
import '../widgets/jakob_icons.dart';

/// A player's court record: rating, numbers, charts, badges, rivals and recent games.
/// As the own tab (isMe) it also offers the decks, changing portrait and name, and signing out.
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
  bool _avatarBusy = false;
  int _request = 0;

  /// Own profile: the name after a rename (or the server's current name) until the shell catches up.
  String? _renamed;

  String get _name => _renamed ?? widget.username;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(ProfileScreen old) {
    super.didUpdateWidget(old);
    if (old.username != widget.username) {
      final caughtUp = _renamed != null && widget.username.trim() == _renamed;
      _renamed = null;
      // The shell now passes the name this screen already shows: nothing to reload.
      if (caughtUp) return;
      _data = null;
      _error = null;
      _load();
    }
  }

  Future<void> _load() async {
    var name = _name.trim();
    if (name.isEmpty && !widget.isMe) return;
    // Ignore answers to requests that a newer username superseded.
    final request = ++_request;
    setState(() => _loading = true);
    var res = name.isEmpty ? null : await Api.get('profile/${Uri.encodeComponent(name)}');
    String? current;
    if (widget.isMe && !_isOwn(res)) {
      // The shell's name can be stale (renamed elsewhere, old session metadata): ask who we are.
      final me = await Api.get('me');
      final profile = me.data is Map ? (me.data as Map)['profile'] : null;
      final fresh = profile is Map ? profile['username'] as String? : null;
      if (fresh != null && fresh != name) {
        current = name = fresh;
        res = await Api.get('profile/${Uri.encodeComponent(fresh)}');
      }
      // Never show someone else's record as the own one (a stale name may belong to another player now).
      if (res != null && res.ok && !_isOwn(res)) res = null;
    }
    if (!mounted || request != _request) return;
    setState(() {
      _loading = false;
      if (current != null) _renamed = current == widget.username ? null : current;
      if (res != null && res.ok && res.data is Map) {
        _data = res.data as Map;
        _error = null;
      } else {
        _error = res?.error ?? 'Profil nicht gefunden.';
      }
    });
  }

  /// Whether the answer is the signed-in player's own profile.
  bool _isOwn(ApiResult<dynamic>? res) {
    if (res == null || !res.ok || res.data is! Map) return false;
    final uid = Supabase.instance.client.auth.currentUser?.id;
    return uid == null || ((res.data as Map)['stats'] as Map?)?['user_id'] == uid;
  }

  void _open(String username) {
    if (username.isEmpty || username.toLowerCase() == _name.toLowerCase()) return;
    Navigator.push(context, MaterialPageRoute(builder: (_) => ProfileScreen(username: username)));
  }

  Future<void> _changeAvatar(bool hasAvatar) async {
    if (_avatarBusy) return;
    final choice = await showAvatarSheet(context, hasAvatar: hasAvatar);
    if (choice == null || !mounted) return;

    if (choice == AvatarChoice.remove) {
      setState(() => _avatarBusy = true);
      final res = await Api.post('profile', {'op': 'removeAvatar'});
      if (!mounted) return;
      if (res.ok) {
        await _load();
        if (mounted) toast(context, 'Profilbild entfernt');
      } else {
        toast(context, res.error!, error: true);
      }
      if (mounted) setState(() => _avatarBusy = false);
      return;
    }

    final result = await pickAndUploadAvatar(
      choice == AvatarChoice.camera ? ImageSource.camera : ImageSource.gallery,
      onPicked: () {
        if (mounted) setState(() => _avatarBusy = true);
      },
    );
    if (!mounted) return;
    switch (result) {
      case AvatarCancelled():
        break;
      case AvatarDone():
        // Keep the spinner until the new portrait is loaded so the old one does not flash.
        await _load();
        if (mounted) toast(context, 'Profilbild aktualisiert');
      case AvatarFailed(:final message):
        toast(context, message, error: true);
    }
    if (mounted) setState(() => _avatarBusy = false);
  }

  Future<void> _rename() async {
    final name = await showRenameSheet(context, current: _name);
    if (name == null || !mounted) return;
    try {
      // New token, so session-bound data catches up with the new name.
      await Supabase.instance.client.auth.refreshSession();
    } catch (_) {
      // The rename is saved either way; the next automatic refresh will do.
    }
    if (!mounted) return;
    setState(() => _renamed = name == widget.username ? null : name);
    toast(context, 'Name geändert');
    await _load();
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
        ] else if (_loading || _name.trim().isNotEmpty)
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
      ProfileHeader(
        stats: stats,
        titles: titles,
        elo: asInt(rating?['rating'] ?? 1000),
        avatarBusy: _avatarBusy,
        onAvatarTap: widget.isMe ? () => _changeAvatar(stats['avatar_url'] != null) : null,
        onRename: widget.isMe ? _rename : null,
      ),
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
              child: const JIcon('cards', size: 28, color: C.goldSoft),
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
