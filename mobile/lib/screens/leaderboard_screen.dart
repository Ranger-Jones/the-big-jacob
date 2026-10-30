import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api.dart';
import '../game/progress.dart';
import '../i18n/i18n.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'profile/profile_widgets.dart';
import 'profile_screen.dart';
import '../widgets/jakob_icons.dart';

enum _Tab { gesamt, monat, elo }

extension on _Tab {
  String get label => switch (this) { _Tab.gesamt => t('Gesamt'), _Tab.monat => t('Monat'), _Tab.elo => t('Elo') };
  String get explain => switch (this) {
        _Tab.gesamt => t('Sortiert nach Siegen, dann nach Kronen. Kampagne und Tagesaufgabe zählen nicht mit.'),
        _Tab.monat => t('Die Saison läuft bis Monatsende. Wer dann vorne liegt, trägt den Titel einen Monat lang.'),
        _Tab.elo => t('Elo steigt, wenn du vor stärkeren Spielern landest, und fällt, wenn schwächere dich überholen.'),
      };
  String get empty => switch (this) {
        _Tab.gesamt => t('Noch keine beendeten Spiele. Das erste Spiel bringt dich auf Platz 1.'),
        _Tab.monat => t('Diesen Monat wurde noch kein Spiel beendet. Die Krone ist noch zu haben!'),
        _Tab.elo => t('Noch keine gewerteten Partien. Spiel online, um in die Wertung zu kommen.'),
      };
}

/// One row, normalised over the three tables.
class _Row {
  final String userId, username;
  final String? avatarUrl;
  final int value;
  final String valueLabel, detail;
  final String? badge;
  const _Row(this.userId, this.username, this.avatarUrl, this.value, this.valueLabel, this.detail, {this.badge});

  factory _Row.from(_Tab tab, Map m) {
    final id = m['user_id'] as String? ?? '', name = m['username'] as String? ?? '?', url = m['avatar_url'] as String?;
    String crowns() => t('{n} Kronen', {'n': asInt(m['crowns'])});
    String games(int n) => n == 1 ? t('{n} Spiel', {'n': 1}) : t('{n} Spiele', {'n': n});
    switch (tab) {
      case _Tab.gesamt:
        return _Row(id, name, url, asInt(m['wins']), t('Siege'),
            '${crowns()} · ${games(asInt(m['games_played']))} · Ø ${deNum(asDouble(m['avg_place']))}');
      case _Tab.monat:
        return _Row(id, name, url, asInt(m['wins']), t('Siege'),
            '${crowns()} · ${games(asInt(m['games']))} · ${t('{n} Punkte', {'n': asInt(m['points'])})}');
      case _Tab.elo:
        final rating = asInt(m['rating']), rated = asInt(m['rated_games']);
        return _Row(id, name, url, rating, t('Elo'),
            '${t('Stufe {level}', {'level': levelFromXp(asInt(m['xp']))})} · ${rated == 1 ? t('1 Partie') : t('{n} Partien', {'n': rated})} · ${t('Bestwert {n}', {'n': asInt(m['peak_rating'])})}',
            badge: tierFor(rating).icon);
    }
  }
}

/// Bestenliste: overall wins, this month's season and the Elo table.
class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  _Tab _tab = _Tab.gesamt;
  final _rows = <_Tab, List<_Row>>{};
  final _errors = <_Tab, String>{};
  String? _monthTitle;

  @override
  void initState() {
    super.initState();
    _load(_tab);
  }

  Future<void> _load(_Tab tab) async {
    final res = await Api.get('leaderboard', {'tab': tab.name});
    if (!mounted) return;
    setState(() {
      if (res.ok && res.data is Map) {
        final data = res.data as Map;
        _rows[tab] = [for (final r in (data['rows'] as List? ?? const []).whereType<Map>()) _Row.from(tab, r)];
        if (tab == _Tab.monat) _monthTitle = data['title'] as String?;
        _errors.remove(tab);
      } else {
        _errors[tab] = res.error ?? t('Unbekannter Fehler.');
      }
    });
  }

  void _select(_Tab tab) {
    if (tab == _tab) return;
    HapticFeedback.selectionClick();
    setState(() => _tab = tab);
    if (!_rows.containsKey(tab)) _load(tab);
  }

  void _open(_Row r) => Navigator.push(context, MaterialPageRoute(builder: (_) => ProfileScreen(username: r.username)));

  @override
  Widget build(BuildContext context) {
    final me = Supabase.instance.client.auth.currentUser?.id;
    final rows = _rows[_tab];
    final error = _errors[_tab];
    final myIndex = rows?.indexWhere((r) => r.userId == me) ?? -1;
    final top = MediaQuery.paddingOf(context).top;

    return Backdrop(
      child: RefreshIndicator(
        color: C.gold,
        backgroundColor: C.surface,
        edgeOffset: top,
        onRefresh: () => _load(_tab),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.fromLTRB(18, top + 14, 18, 120),
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(child: Text(t('Bestenliste'), style: T.display(40))),
              if (myIndex >= 0) Pill(t('Du: Platz {place}', {'place': myIndex + 1}), jicon: 'user', color: C.gold.withValues(alpha: .2), textColor: C.goldSoft),
            ]),
            const SizedBox(height: 16),
            _Segmented(value: _tab, onChanged: _select),
            const SizedBox(height: 12),
            if (_tab == _Tab.monat && _monthTitle != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(t('Es geht um den Titel „{title}“', {'title': t(_monthTitle!)}), style: T.body(15, color: C.goldSoft, weight: FontWeight.w700)),
              ),
            Text(_tab.explain, style: T.body(14, color: C.inkSoft)),
            const SizedBox(height: 8),
            if (rows == null && error != null) ...[
              EmptyNote(error, icon: Icons.wifi_off_rounded),
              SoftButton(label: t('Nochmal versuchen'), icon: Icons.refresh_rounded, onPressed: () => _load(_tab)),
            ] else if (rows == null)
              const Padding(padding: EdgeInsets.only(top: 80), child: Center(child: CircularProgressIndicator(color: C.gold)))
            else if (rows.isEmpty)
              Padding(padding: const EdgeInsets.only(top: 12), child: Panel(child: EmptyNote(_tab.empty, icon: Icons.emoji_events_outlined)))
            else
              KeyedSubtree(
                key: ValueKey(_tab),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  _Podium(rows: rows.take(3).toList(), me: me, onTap: _open),
                  const SizedBox(height: 14),
                  for (var i = 3; i < rows.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _RankRow(place: i + 1, row: rows[i], mine: rows[i].userId == me, onTap: () => _open(rows[i])),
                    ).animate(delay: (300 + (i - 3).clamp(0, 12) * 35).ms).fadeIn(duration: 260.ms).moveY(begin: 12, end: 0),
                ]),
              ),
          ],
        ),
      ),
    );
  }
}

/// Pill toggle "Gesamt · Monat · Elo" with a sliding gold thumb.
class _Segmented extends StatelessWidget {
  final _Tab value;
  final ValueChanged<_Tab> onChanged;
  const _Segmented({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    const tabs = _Tab.values;
    return Container(
      height: 52,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: C.velvet, borderRadius: BorderRadius.circular(99), border: Border.all(color: C.line)),
      child: Stack(children: [
        AnimatedAlign(
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOutCubic,
          alignment: Alignment(-1 + 2 * value.index / (tabs.length - 1), 0),
          child: FractionallySizedBox(
            widthFactor: 1 / tabs.length,
            heightFactor: 1,
            child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [C.goldSoft, C.gold]),
                borderRadius: BorderRadius.circular(99),
                boxShadow: [BoxShadow(color: C.gold.withValues(alpha: .3), blurRadius: 12)],
              ),
            ),
          ),
        ),
        Row(children: [
          for (final tab in tabs)
            Expanded(
              child: Semantics(
                selected: tab == value,
                button: true,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onChanged(tab),
                  child: Center(
                    child: AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 200),
                      style: T.body(16, weight: FontWeight.w800, color: tab == value ? C.onGold : C.inkSoft),
                      child: Text(tab.label),
                    ),
                  ),
                ),
              ),
            ),
        ]),
      ]),
    );
  }
}

/// Top three on stepped pedestals: 2 – 1 – 3.
class _Podium extends StatelessWidget {
  final List<_Row> rows;
  final String? me;
  final void Function(_Row) onTap;
  const _Podium({required this.rows, required this.me, required this.onTap});

  @override
  Widget build(BuildContext context) {
    const order = [1, 0, 2];
    return Padding(
      padding: const EdgeInsets.only(top: 22),
      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        for (final i in order)
          Expanded(
            child: i < rows.length
                ? _Pedestal(place: i + 1, row: rows[i], mine: rows[i].userId == me, onTap: () => onTap(rows[i]))
                    .animate(delay: (const [150, 0, 300][i]).ms)
                    .fadeIn(duration: 350.ms)
                    .moveY(begin: 60, end: 0, duration: 650.ms, curve: Curves.easeOutBack)
                : const SizedBox.shrink(),
          ),
      ]),
    );
  }
}

class _Pedestal extends StatelessWidget {
  final int place;
  final _Row row;
  final bool mine;
  final VoidCallback onTap;
  const _Pedestal({required this.place, required this.row, required this.mine, required this.onTap});

  static const _metal = {1: C.gold, 2: Color(0xFFC9CED6), 3: Color(0xFFC98A4B)};

  @override
  Widget build(BuildContext context) {
    final first = place == 1;
    final metal = _metal[place]!;
    final avatar = first ? 84.0 : 66.0;
    final height = switch (place) { 1 => 116.0, 2 => 86.0, _ => 66.0 };

    Widget crown = first ? const JIcon('crown', size: 38, color: C.gold) : Medal(place, size: 28);
    if (first) {
      crown = crown.animate(onPlay: (c) => c.repeat(reverse: true)).moveY(begin: -2, end: 3, duration: 1600.ms, curve: Curves.easeInOut);
    }

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          crown,
          const SizedBox(height: 2),
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: metal.withValues(alpha: first ? .45 : .25), blurRadius: first ? 26 : 14)],
            ),
            child: Avatar(name: row.username, url: row.avatarUrl, size: avatar, ring: metal),
          ),
          const SizedBox(height: 8),
          Text(mine ? t('Du') : row.username, style: T.body(first ? 17 : 15, weight: FontWeight.w800, color: mine ? C.goldSoft : C.ink), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 6),
          Container(
            height: height,
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
              gradient: LinearGradient(
                begin: Alignment.topCenter, end: Alignment.bottomCenter,
                colors: [metal.withValues(alpha: first ? .42 : .28), metal.withValues(alpha: .04)],
              ),
              border: Border(top: BorderSide(color: metal.withValues(alpha: .8), width: 2)),
            ),
            padding: const EdgeInsets.only(top: 10),
            child: Column(children: [
              Row(mainAxisSize: MainAxisSize.min, children: [
                if (row.badge != null) ...[JIcon(row.badge!, size: first ? 22 : 18, color: C.goldSoft), const SizedBox(width: 4)],
                Text('${row.value}', style: T.display(first ? 30 : 24, color: first ? C.goldSoft : C.ink)),
              ]),
              Text(row.valueLabel, style: T.label(12)),
              if (first) ...[const Spacer(), Text('1', style: T.display(26, color: C.gold.withValues(alpha: .5))), const SizedBox(height: 6)],
            ]),
          ),
        ]),
      ),
    );
  }
}

class _RankRow extends StatelessWidget {
  final int place;
  final _Row row;
  final bool mine;
  final VoidCallback onTap;
  const _RankRow({required this.place, required this.row, required this.mine, required this.onTap});

  @override
  Widget build(BuildContext context) => Panel(
        padding: const EdgeInsets.fromLTRB(12, 10, 16, 10),
        color: mine ? C.surfaceHi : null,
        glow: mine,
        onTap: onTap,
        child: Row(children: [
          SizedBox(width: 36, child: Text('$place', textAlign: TextAlign.center, style: T.display(24, color: mine ? C.goldSoft : C.inkSoft))),
          const SizedBox(width: 8),
          Avatar(name: row.username, url: row.avatarUrl, size: 44, ring: mine ? C.gold : null),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(child: Text(row.username, style: T.body(17, weight: FontWeight.w800), overflow: TextOverflow.ellipsis)),
                if (mine) ...[const SizedBox(width: 6), Pill(t('Du'), color: C.gold, textColor: C.onGold)],
              ]),
              Text(row.detail, style: T.body(13, color: C.inkSoft), maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              if (row.badge != null) ...[JIcon(row.badge!, size: 18, color: C.goldSoft), const SizedBox(width: 4)],
              Text('${row.value}', style: T.display(24, color: C.goldSoft)),
            ]),
            Text(row.valueLabel, style: T.label(11, color: C.inkMute)),
          ]),
        ]),
      );
}
