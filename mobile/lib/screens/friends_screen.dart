import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api.dart';
import '../game/models.dart';
import '../i18n/i18n.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/jakob_icons.dart';
import 'friends/qr_friend_sheet.dart';
import 'game_screen.dart';
import 'profile_screen.dart';

/// One row of the friend lists: the friendship id plus the other person.
class _Entry {
  final String id;
  final Profile profile;
  const _Entry(this.id, this.profile);

  static List<_Entry> list(dynamic raw) => ((raw as List?) ?? const [])
      .whereType<Map>()
      .map((m) => _Entry(m['friendshipId'] as String? ?? '', Profile.from((m['profile'] as Map?) ?? const {})))
      .toList();
}

/// Friends tab: search, incoming and outgoing requests, the friend list with
/// online presence and quick table invites. Updates live via Supabase realtime.
class FriendsScreen extends StatefulWidget {
  final void Function(int) onRequestsChanged;
  const FriendsScreen({super.key, required this.onRequestsChanged});

  @override
  State<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends State<FriendsScreen> with WidgetsBindingObserver {
  final SupabaseClient _sb = Supabase.instance.client;
  late final String _me = _sb.auth.currentUser!.id;

  bool _loaded = false;
  String? _error;
  List<_Entry> _friends = const [], _incoming = const [], _outgoing = const [];

  // Search state.
  final _searchCtrl = TextEditingController();
  final _searchFocus = FocusNode();
  Timer? _debounce;
  bool _searching = false;
  List<Profile>? _results;

  // Keys of actions in flight (e.g. "invite:<id>"), to show spinners and block double taps.
  final Set<String> _busy = {};

  // Realtime: friendship changes, own presence and one presence channel per friend.
  RealtimeChannel? _friendsChannel, _ownPresence;
  final Map<String, RealtimeChannel> _presence = {};
  final Set<String> _online = {};
  Timer? _reloadTimer, _tablesTimer;
  /// Friends sitting at a running table: friend id → {code, round, players}.
  Map<String, Map> _atTable = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _subscribe();
    // Who is playing changes without any friendship event: look again now and then.
    _tablesTimer = Timer.periodic(const Duration(seconds: 45), (_) => _load());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // iOS drops the websocket in the background. Coming back, join the presence channels again
    // so friends see us online (and we see them) without restarting the app.
    if (state != AppLifecycleState.resumed) return;
    for (final ch in [_ownPresence, ..._presence.values]) {
      if (ch != null) _sb.removeChannel(ch);
    }
    _ownPresence = null;
    _presence.clear();
    setState(_online.clear);
    _trackOwnPresence();
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tablesTimer?.cancel();
    _debounce?.cancel();
    _reloadTimer?.cancel();
    _searchCtrl.dispose();
    _searchFocus.dispose();
    for (final ch in [_friendsChannel, _ownPresence, ..._presence.values]) {
      if (ch != null) _sb.removeChannel(ch);
    }
    super.dispose();
  }

  // ---------------------------------------------------------------- data

  Future<void> _load() async {
    final res = await Api.get('friends');
    if (!mounted) return;
    setState(() {
      _loaded = true;
      if (res.ok) {
        final d = res.data as Map;
        _friends = _Entry.list(d['friends']);
        _incoming = _Entry.list(d['incoming']);
        _outgoing = _Entry.list(d['outgoing']);
        _atTable = {
          for (final table in ((d['tables'] as List?) ?? const []).whereType<Map>())
            for (final id in ((table['friendIds'] as List?) ?? const []).whereType<String>()) id: table,
        };
        _error = null;
      } else {
        _error = res.error;
      }
    });
    if (res.ok) {
      widget.onRequestsChanged(_incoming.length);
      _syncPresence();
    }
  }

  /// Coalesces bursts of realtime events (a request touches two filters) into one reload.
  void _scheduleReload() {
    _reloadTimer?.cancel();
    _reloadTimer = Timer(const Duration(milliseconds: 250), () {
      if (mounted) _load();
    });
  }

  void _subscribe() {
    _friendsChannel = _sb
        .channel('friends:$_me')
        .onPostgresChanges(
          event: PostgresChangeEvent.all, schema: 'public', table: 'friendships',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'requester_id', value: _me),
          callback: (_) => _scheduleReload(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all, schema: 'public', table: 'friendships',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'addressee_id', value: _me),
          callback: (_) => _scheduleReload(),
        )
      ..subscribe();

    _trackOwnPresence();
  }

  /// Like the web: everyone tracks presence in their own private channel `online:<id>`,
  /// friends listen there. The friends tab lives for the whole app session (IndexedStack).
  void _trackOwnPresence() {
    final own = _sb.channel('online:$_me', opts: RealtimeChannelConfig(private: true, key: _me));
    _ownPresence = own;
    own.subscribe((status, _) async {
      if (status == RealtimeSubscribeStatus.subscribed) await own.track({});
    });
  }

  /// Opens a presence listener for every friend and closes those of removed friends.
  void _syncPresence() {
    final ids = _friends.map((f) => f.profile.id).where((id) => id.isNotEmpty).toSet();
    for (final id in _presence.keys.toList()) {
      if (ids.contains(id)) continue;
      _sb.removeChannel(_presence.remove(id)!);
      _online.remove(id);
    }
    for (final id in ids) {
      if (_presence.containsKey(id)) continue;
      final ch = _sb.channel('online:$id', opts: const RealtimeChannelConfig(private: true));
      _presence[id] = ch;
      ch.onPresenceSync((_) {
        final here = ch.presenceState().any((s) => s.key == id);
        if (!mounted || _online.contains(id) == here) return;
        setState(() => here ? _online.add(id) : _online.remove(id));
      }).subscribe();
    }
  }

  // ---------------------------------------------------------------- search

  void _onQuery(String value) {
    _debounce?.cancel();
    final q = value.trim();
    if (q.length < 2) {
      setState(() {
        _results = null;
        _searching = false;
      });
      return;
    }
    setState(() => _searching = true);
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(q));
  }

  Future<void> _search(String q) async {
    final res = await Api.get('search', {'q': q});
    // Ignore answers to queries the user has already typed past.
    if (!mounted || _searchCtrl.text.trim() != q) return;
    setState(() {
      _searching = false;
      _results = res.ok ? ((res.data as List?) ?? const []).whereType<Map>().map(Profile.from).toList() : const [];
    });
    if (!res.ok) toast(context, res.error!, error: true);
  }

  void _clearSearch() {
    _debounce?.cancel();
    _searchCtrl.clear();
    setState(() {
      _results = null;
      _searching = false;
    });
  }

  // ---------------------------------------------------------------- actions

  Future<void> _run(String key, Future<void> Function() action) async {
    if (_busy.contains(key)) return;
    setState(() => _busy.add(key));
    try {
      await action();
    } finally {
      if (mounted) setState(() => _busy.remove(key));
    }
  }

  Future<void> _request(Profile p) => _run('request:${p.id}', () async {
        final res = await Api.post('friends', {'op': 'request', 'username': p.username});
        if (!mounted) return;
        if (!res.ok) return toast(context, res.error!, error: true);
        final accepted = (res.data as Map?)?['status'] == 'accepted';
        toast(context, accepted ? t('Ihr seid jetzt Freunde!') : t('Anfrage an {name} gesendet', {'name': p.username}));
        _clearSearch();
        _searchFocus.unfocus();
        await _load();
      });

  Future<void> _respond(_Entry e, bool accept) => _run('respond:${e.id}', () async {
        final res = await Api.post('friends', {'op': 'respond', 'id': e.id, 'accept': accept});
        if (!mounted) return;
        if (!res.ok) return toast(context, res.error!, error: true);
        if (accept) {
          HapticFeedback.mediumImpact();
          toast(context, t('Du und {name} seid jetzt Freunde', {'name': e.profile.username}));
        }
        await _load();
      });

  Future<void> _withdraw(_Entry e) => _run('remove:${e.id}', () async {
        final res = await Api.post('friends', {'op': 'remove', 'id': e.id});
        if (!mounted) return;
        if (!res.ok) return toast(context, res.error!, error: true);
        toast(context, t('Anfrage an {name} zurückgezogen', {'name': e.profile.username}));
        await _load();
      });

  Future<void> _remove(_Entry e) async {
    final sure = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(t('Freundschaft beenden?'), style: T.display(28)),
        content: Text(t('Möchtest du {name} wirklich aus deiner Freundesliste entfernen?', {'name': e.profile.username}), style: T.body(16, color: C.inkSoft)),
        actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        actions: [
          Row(children: [
            Expanded(child: SoftButton(label: t('Abbrechen'), onPressed: () => Navigator.pop(ctx, false))),
            const SizedBox(width: 10),
            Expanded(child: SoftButton(label: t('Entfernen'), danger: true, icon: Icons.person_remove_rounded, onPressed: () => Navigator.pop(ctx, true))),
          ]),
        ],
      ),
    );
    if (sure != true || !mounted) return;
    await _run('remove:${e.id}', () async {
      final res = await Api.post('friends', {'op': 'remove', 'id': e.id});
      if (!mounted) return;
      if (!res.ok) return toast(context, res.error!, error: true);
      toast(context, t('{name} ist nicht mehr in deiner Freundesliste', {'name': e.profile.username}));
      await _load();
    });
  }

  Future<void> _invite(_Entry e) => _run('invite:${e.profile.id}', () async {
        final res = await Api.post('invite', {'friendId': e.profile.id});
        if (!mounted) return;
        if (!res.ok) return toast(context, res.error!, error: true);
        final d = res.data as Map;
        final code = d['code'] as String?;
        toast(context, d['alreadyThere'] == true ? t('{name} sitzt schon an deinem Tisch', {'name': e.profile.username}) : t('Einladung an {name} gesendet', {'name': e.profile.username}));
        if (code != null) await openTable(context, code);
        if (mounted) _load();
      });

  /// QR sheet ("Mein Code" or straight to "Scannen"); reloads after a request went out.
  Future<void> _openQr({bool scan = false}) async {
    _searchFocus.unfocus();
    final message = await showQrFriendSheet(context, scan: scan);
    if (!mounted || message == null) return;
    toast(context, message);
    await _load();
  }

  void _openProfile(Profile p) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => ProfileScreen(username: p.username, isMe: false)));

  // ---------------------------------------------------------------- build

  @override
  Widget build(BuildContext context) {
    final known = {..._friends, ..._incoming, ..._outgoing}.map((e) => e.profile.id).toSet();
    final friends = [..._friends]
      ..sort((a, b) {
        final byOnline = (_online.contains(b.profile.id) ? 1 : 0) - (_online.contains(a.profile.id) ? 1 : 0);
        return byOnline != 0 ? byOnline : a.profile.username.toLowerCase().compareTo(b.profile.username.toLowerCase());
      });
    final onlineCount = friends.where((f) => _online.contains(f.profile.id)).length;

    return Backdrop(
      child: RefreshIndicator(
        color: C.gold,
        backgroundColor: C.surface,
        onRefresh: _load,
        child: ListView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: EdgeInsets.fromLTRB(18, MediaQuery.paddingOf(context).top + 14, 18, 120),
          children: [
            _Header(count: friends.length, online: onlineCount, loaded: _loaded, onScan: () => _openQr(scan: true)),
            const SizedBox(height: 18),
            _QrAction(onTap: _openQr),
            const SizedBox(height: 12),
            _SearchField(
              controller: _searchCtrl,
              focusNode: _searchFocus,
              searching: _searching,
              onChanged: _onQuery,
              onClear: _clearSearch,
            ),
            _buildSearchResults(known),
            if (_error != null) ...[const SizedBox(height: 14), EmptyNote(_error!, icon: Icons.wifi_off_rounded)],
            if (!_loaded) ...[
              const SizedBox(height: 26),
              for (var i = 0; i < 3; i++) const _SkeletonRow(),
            ] else ...[
              if (_incoming.isNotEmpty) ...[
                const SizedBox(height: 22),
                _IncomingPanel(
                  entries: _incoming,
                  busy: _busy,
                  onRespond: _respond,
                  onOpen: _openProfile,
                ),
              ],
              SectionTitle(
                t('Deine Freunde'),
                trailing: friends.isEmpty ? null : Pill(t('{count} online', {'count': onlineCount}), icon: Icons.circle, textColor: onlineCount > 0 ? C.vert : C.inkSoft),
              ),
              if (friends.isEmpty && _error == null)
                _EmptyFriends(onSearch: () => _searchFocus.requestFocus())
              else
                for (var i = 0; i < friends.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _FriendRow(
                      entry: friends[i],
                      online: _online.contains(friends[i].profile.id),
                      table: _atTable[friends[i].profile.id],
                      onWatch: () => openTable(context, _atTable[friends[i].profile.id]!['code'] as String, spectate: true),
                      inviting: _busy.contains('invite:${friends[i].profile.id}'),
                      onInvite: () => _invite(friends[i]),
                      onOpen: () => _openProfile(friends[i].profile),
                      onRemove: () => _remove(friends[i]),
                    ),
                  ).animate(key: ValueKey('f-${friends[i].id}'), delay: (40 * i.clamp(0, 8)).ms).fadeIn(duration: 280.ms).slideY(begin: .12, curve: Curves.easeOutCubic),
              if (_outgoing.isNotEmpty) ...[
                Padding(
                  padding: const EdgeInsets.only(top: 26, bottom: 10),
                  child: Text(t('Gesendete Anfragen'), style: T.display(22, color: C.inkSoft)),
                ),
                for (final e in _outgoing)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _OutgoingRow(entry: e, busy: _busy.contains('remove:${e.id}'), onWithdraw: () => _withdraw(e), onOpen: () => _openProfile(e.profile)),
                  ).animate(key: ValueKey('o-${e.id}')).fadeIn(duration: 260.ms),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSearchResults(Set<String> known) {
    final q = _searchCtrl.text.trim();
    if (q.isEmpty) return const SizedBox.shrink();
    if (q.length < 2) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(6, 10, 6, 0),
        child: Text(t('Mindestens zwei Buchstaben, bitte.'), style: T.body(14, color: C.inkMute)),
      );
    }
    final raw = _results;
    if (raw == null) return const SizedBox.shrink();
    final visible = raw.where((p) => !known.contains(p.id)).toList();
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Panel(
        padding: const EdgeInsets.fromLTRB(14, 6, 10, 6),
        child: visible.isEmpty
            ? EmptyNote(
                raw.isEmpty ? t('Niemand mit diesem Namen gefunden.') : t('Alle Treffer kennst du schon.'),
                icon: raw.isEmpty ? Icons.search_off_rounded : Icons.handshake_rounded,
              )
            : Column(children: [
                for (var i = 0; i < visible.length; i++) ...[
                  if (i > 0) const Divider(height: 1, color: C.line),
                  _PersonRow(
                    profile: visible[i],
                    onOpen: () => _openProfile(visible[i]),
                    trailing: _SmallButton(
                      label: t('Anfrage senden'),
                      icon: Icons.person_add_alt_1_rounded,
                      busy: _busy.contains('request:${visible[i].id}'),
                      onPressed: () => _request(visible[i]),
                    ),
                  ).animate(key: ValueKey('s-${visible[i].id}'), delay: (30 * i).ms).fadeIn(duration: 220.ms).slideX(begin: .04),
                ],
              ]),
      ),
    ).animate().fadeIn(duration: 200.ms);
  }
}

// ------------------------------------------------------------------ widgets

class _Header extends StatelessWidget {
  final int count, online;
  final bool loaded;
  final VoidCallback onScan;
  const _Header({required this.count, required this.online, required this.loaded, required this.onScan});

  @override
  Widget build(BuildContext context) {
    final friends = count == 1 ? t('1 Freund') : t('{count} Freunde', {'count': count});
    final sub = !loaded || count == 0
        ? t('Dein Gefolge am Hof')
        : online > 0
            ? t('{friends} · {online} gerade da', {'friends': friends, 'online': online})
            : friends;
    return Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(sub, style: T.body(16, color: C.inkSoft)),
          Text(t('Freunde'), style: T.display(40)),
        ]),
      ),
      const JIcon('friends', size: 34, color: C.gold)
          .animate(onPlay: (c) => c.repeat(reverse: true))
          .rotate(begin: -.02, end: .02, duration: 1800.ms, curve: Curves.easeInOut),
      const SizedBox(width: 10),
      Material(
        color: C.surfaceHi,
        shape: const CircleBorder(side: BorderSide(color: C.line)),
        child: IconButton(
          tooltip: t('Code scannen'),
          constraints: const BoxConstraints.tightFor(width: 48, height: 48),
          onPressed: () {
            HapticFeedback.selectionClick();
            onScan();
          },
          icon: const JIcon('scan', size: 24, color: C.goldSoft),
        ),
      ),
    ]);
  }
}

/// Prominent entry to the QR sheet: for two players standing next to each other.
class _QrAction extends StatelessWidget {
  final VoidCallback onTap;
  const _QrAction({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Panel(
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Row(children: [
        Container(
          width: 48, height: 48,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [C.goldSoft, C.gold]),
            boxShadow: const [BoxShadow(color: C.goldDeep, offset: Offset(0, 2))],
          ),
          alignment: Alignment.center,
          child: const JIcon('qr', size: 26, color: C.onGold),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t('Per QR-Code hinzufügen'), style: T.body(17, weight: FontWeight.w800)),
            Text(t('Ihr steht nebeneinander? Code zeigen oder scannen.'), style: T.body(14, color: C.inkSoft)),
          ]),
        ),
        const SizedBox(width: 8),
        const Icon(Icons.chevron_right_rounded, color: C.inkMute),
      ]),
    ).animate().fadeIn(duration: 320.ms).slideY(begin: .1, curve: Curves.easeOutCubic);
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool searching;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;
  const _SearchField({required this.controller, required this.focusNode, required this.searching, required this.onChanged, required this.onClear});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      autocorrect: false,
      enableSuggestions: false,
      style: T.body(17),
      cursorColor: C.gold,
      decoration: InputDecoration(
        hintText: t('Name suchen …'),
        prefixIcon: const Icon(Icons.search_rounded, color: C.inkSoft),
        suffixIcon: ValueListenableBuilder<TextEditingValue>(
          valueListenable: controller,
          builder: (_, value, _) {
            if (searching) {
              return const Padding(
                padding: EdgeInsets.all(15),
                child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: C.gold)),
              );
            }
            if (value.text.isEmpty) return const SizedBox.shrink();
            return IconButton(tooltip: t('Leeren'), onPressed: onClear, icon: const Icon(Icons.close_rounded, color: C.inkSoft));
          },
        ),
      ),
    );
  }
}

/// Avatar with a small presence dot in the corner.
class _PresenceAvatar extends StatelessWidget {
  final Profile profile;
  final bool online;
  const _PresenceAvatar({required this.profile, required this.online});

  static const size = 48.0;

  @override
  Widget build(BuildContext context) {
    const dot = size * .28;
    return SizedBox(
      width: size, height: size,
      child: Stack(clipBehavior: Clip.none, children: [
        Avatar.of(profile, size: size, ring: online ? C.vert.withValues(alpha: .8) : null),
        Positioned(
          right: -1, bottom: -1,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            width: dot, height: dot,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: online ? C.vert : C.inkMute,
              border: Border.all(color: C.surface, width: 2.5),
              boxShadow: online ? [BoxShadow(color: C.vert.withValues(alpha: .6), blurRadius: 8)] : null,
            ),
          ),
        ),
      ]),
    );
  }
}

/// Compact action used inside rows: gold-filled or gold-outlined, at least 48 px tall.
class _SmallButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool busy, outlined;
  const _SmallButton({required this.label, this.icon, this.onPressed, this.busy = false, this.outlined = false});

  @override
  Widget build(BuildContext context) {
    final fg = outlined ? C.goldSoft : C.onGold;
    final enabled = onPressed != null && !busy;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: enabled
            ? () {
                HapticFeedback.lightImpact();
                onPressed!();
              }
            : null,
        child: Ink(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: outlined ? null : const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [C.goldSoft, C.gold]),
            color: outlined ? C.gold.withValues(alpha: .08) : null,
            border: Border.all(color: outlined ? C.gold.withValues(alpha: .55) : C.goldDeep),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            if (busy)
              SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: fg))
            else if (icon != null)
              Icon(icon, size: 19, color: fg),
            if (busy || icon != null) const SizedBox(width: 7),
            Text(label, style: T.body(15, color: fg, weight: FontWeight.w800)),
          ]),
        ),
      ),
    );
  }
}

/// A plain person line (search results, requests): avatar, name, trailing actions.
class _PersonRow extends StatelessWidget {
  final Profile profile;
  final String? subtitle;
  final Widget trailing;
  final VoidCallback onOpen;
  const _PersonRow({required this.profile, required this.trailing, required this.onOpen, this.subtitle});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: onOpen,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Row(children: [
                  Avatar.of(profile, size: 42),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                      Text(profile.username, style: T.body(17, weight: FontWeight.w800), overflow: TextOverflow.ellipsis),
                      if (subtitle != null) Text(subtitle!, style: T.body(13, color: C.inkSoft), overflow: TextOverflow.ellipsis),
                    ]),
                  ),
                ]),
              ),
            ),
          ),
          const SizedBox(width: 8),
          trailing,
        ]),
      );
}

class _IncomingPanel extends StatelessWidget {
  final List<_Entry> entries;
  final Set<String> busy;
  final Future<void> Function(_Entry, bool) onRespond;
  final void Function(Profile) onOpen;
  const _IncomingPanel({required this.entries, required this.busy, required this.onRespond, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    return Panel(
      glow: true,
      padding: const EdgeInsets.fromLTRB(16, 16, 10, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const JIcon('scroll', size: 24, color: C.goldSoft),
          const SizedBox(width: 10),
          Expanded(child: Text(entries.length == 1 ? t('Neue Anfrage') : t('Neue Anfragen'), style: T.display(24, color: C.goldSoft))),
          Padding(
            padding: const EdgeInsets.only(right: 6),
            child: Pill('${entries.length}', color: C.gold, textColor: C.onGold),
          ),
        ]),
        const SizedBox(height: 6),
        for (var i = 0; i < entries.length; i++) ...[
          if (i > 0) const Divider(height: 1, color: C.line),
          _PersonRow(
            profile: entries[i].profile,
            subtitle: t('möchte mit dir befreundet sein'),
            onOpen: () => onOpen(entries[i].profile),
            trailing: busy.contains('respond:${entries[i].id}')
                ? const SizedBox(
                    width: 48, height: 48,
                    child: Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.2, color: C.gold))),
                  )
                : Row(mainAxisSize: MainAxisSize.min, children: [
                    IconButton(
                      tooltip: t('Ablehnen'),
                      constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                      onPressed: () => onRespond(entries[i], false),
                      icon: const Icon(Icons.close_rounded, color: C.inkSoft),
                    ),
                    const SizedBox(width: 4),
                    _SmallButton(label: t('Annehmen'), icon: Icons.check_rounded, onPressed: () => onRespond(entries[i], true)),
                  ]),
          ).animate(key: ValueKey('i-${entries[i].id}'), delay: (60 * i).ms).fadeIn(duration: 300.ms).slideX(begin: .06),
        ],
      ]),
    )
        .animate()
        .fadeIn(duration: 350.ms)
        .scaleXY(begin: .97, curve: Curves.easeOutBack, duration: 450.ms);
  }
}

class _FriendRow extends StatelessWidget {
  final _Entry entry;
  final bool online, inviting;
  /// The running table this friend sits at, if any.
  final Map? table;
  final VoidCallback onInvite, onOpen, onRemove, onWatch;
  const _FriendRow({
    required this.entry, required this.online, required this.inviting, required this.onInvite, required this.onOpen,
    required this.onRemove, required this.onWatch, this.table,
  });

  @override
  Widget build(BuildContext context) {
    final p = entry.profile;
    return Panel(
      onTap: onOpen,
      padding: const EdgeInsets.fromLTRB(14, 12, 4, 12),
      child: Row(children: [
        _PresenceAvatar(profile: p, online: online),
        const SizedBox(width: 13),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p.username, style: T.body(18, weight: FontWeight.w800), overflow: TextOverflow.ellipsis),
            if (table != null)
              Text(t('spielt gerade · Runde {round}', {'round': table!['round']}), style: T.label(13, color: C.goldSoft))
            else
              Text(online ? t('online') : t('nicht da'), style: T.label(13, color: online ? C.vert : C.inkMute)),
          ]),
        ),
        if (table != null)
          _SmallButton(label: t('Zuschauen'), icon: Icons.visibility_rounded, outlined: true, busy: false, onPressed: onWatch)
        else
          _SmallButton(label: t('Einladen'), icon: Icons.style_rounded, outlined: true, busy: inviting, onPressed: onInvite),
        PopupMenuButton<String>(
          tooltip: t('Mehr'),
          icon: const Icon(Icons.more_horiz_rounded, color: C.inkSoft),
          color: C.surfaceHi,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: C.line)),
          onSelected: (v) => v == 'profile' ? onOpen() : onRemove(),
          itemBuilder: (_) => [
            PopupMenuItem(
              value: 'profile',
              height: 48,
              child: Row(children: [
                const Icon(Icons.person_rounded, size: 20, color: C.ink),
                const SizedBox(width: 12),
                Text(t('Profil ansehen'), style: T.body(16)),
              ]),
            ),
            PopupMenuItem(
              value: 'remove',
              height: 48,
              child: Row(children: [
                const Icon(Icons.person_remove_rounded, size: 20, color: C.wax),
                const SizedBox(width: 12),
                Text(t('Entfernen'), style: T.body(16, color: C.wax)),
              ]),
            ),
          ],
        ),
      ]),
    );
  }
}

class _OutgoingRow extends StatelessWidget {
  final _Entry entry;
  final bool busy;
  final VoidCallback onWithdraw, onOpen;
  const _OutgoingRow({required this.entry, required this.busy, required this.onWithdraw, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: .78,
      child: Panel(
        color: C.velvet,
        padding: const EdgeInsets.fromLTRB(14, 4, 6, 4),
        child: _PersonRow(
          profile: entry.profile,
          subtitle: t('wartet auf Antwort'),
          onOpen: onOpen,
          trailing: SizedBox(
            height: 48,
            child: TextButton(
              onPressed: busy ? null : onWithdraw,
              style: TextButton.styleFrom(foregroundColor: C.inkSoft, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              child: busy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: C.inkSoft))
                  : Text(t('Zurückziehen'), style: T.body(15, color: C.inkSoft, weight: FontWeight.w700)),
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyFriends extends StatelessWidget {
  final VoidCallback onSearch;
  const _EmptyFriends({required this.onSearch});

  @override
  Widget build(BuildContext context) {
    return Panel(
      padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
      child: Column(children: [
        const JIcon('castle', size: 46, color: C.gold)
            .animate(onPlay: (c) => c.repeat(reverse: true))
            .moveY(begin: -3, end: 3, duration: 1700.ms, curve: Curves.easeInOut),
        const SizedBox(height: 10),
        Text(t('Noch ganz allein am Hof'), style: T.display(26), textAlign: TextAlign.center),
        const SizedBox(height: 6),
        Text(
          t('Such oben nach dem Namen deiner Freunde und schick ihnen eine Anfrage. Dann könnt ihr euch gegenseitig an den Tisch holen.'),
          style: T.body(15, color: C.inkSoft, height: 1.35),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 18),
        SoftButton(label: t('Jemanden suchen'), icon: Icons.search_rounded, onPressed: onSearch),
      ]),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: .06);
  }
}

/// Placeholder row while the first load is running.
class _SkeletonRow extends StatelessWidget {
  const _SkeletonRow();

  @override
  Widget build(BuildContext context) {
    Widget bar(double w, double h) => Container(width: w, height: h, decoration: BoxDecoration(color: C.surfaceHi, borderRadius: BorderRadius.circular(8)));
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Panel(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(width: 48, height: 48, decoration: const BoxDecoration(color: C.surfaceHi, shape: BoxShape.circle)),
          const SizedBox(width: 13),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [bar(120, 14), const SizedBox(height: 8), bar(60, 10)]),
        ]),
      ),
    ).animate(onPlay: (c) => c.repeat(reverse: true)).fade(begin: .45, end: .9, duration: 900.ms);
  }
}
