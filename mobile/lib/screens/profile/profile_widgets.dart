import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/models.dart';
import '../../game/progress.dart';
import '../../game/rules.dart';
import '../../theme.dart';
import '../../widgets/charts.dart';
import '../../widgets/common.dart';
import '../../widgets/playing_card.dart';

// ---------------------------------------------------------------------------
// Parsing and formatting helpers (JSON numbers may arrive as int, double or string).

int asInt(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
double asDouble(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
List<int> asIntList(dynamic v) => v is List ? v.map(asInt).toList() : const [];

/// German decimal comma, trailing ",0" dropped.
String deNum(double v, [int digits = 1]) {
  final s = v.toStringAsFixed(digits);
  return (s.endsWith('.0') ? s.substring(0, s.length - 2) : s).replaceAll('.', ',');
}

const _months = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];

String deDate(String iso, {bool time = true}) {
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return '';
  final date = '${d.day}. ${_months[d.month - 1]}';
  if (!time) return date;
  return '$date, ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}

String placeMedal(int? place) => switch (place) { 1 => '🥇', 2 => '🥈', 3 => '🥉', null => '–', _ => '$place.' };

/// The built-in "Hofstaat" deck, used to show the favourite card.
final hofstaatDeck = Deck.from({
  'id': 'preset:hofstaat',
  'name': 'Hofstaat',
  'design': {
    'frame': '#6b1e2e', 'accent': '#b07a12', 'paper': '#fbf0d9', 'ink': '#2b1a12', 'font': 'gotisch', 'photoFit': 'vollbild',
    'back': {'pattern': 'rauten', 'a': '#6b1e2e', 'b': '#8e2f40', 'emblem': '👑'},
    'cards': [
      for (final c in const [
        ['👑', 'p-jakob'], ['⛪', 'p-erzbischof'], ['🎖️', 'p-marschall'], ['💎', 'p-baronin'], ['📿', 'p-aebtissin'],
        ['🛡️', 'p-ritter'], ['🧵', 'p-naeherin'], ['🧱', 'p-maurer'], ['🍲', 'p-koechin'], ['🐑', 'p-schaeferin'],
        ['⛏️', 'p-steinmetz'], ['🌾', 'p-bauer'], ['🃏', 'p-narr'],
      ].indexed)
        {'name': rankNames[c.$1 + 1], 'emoji': c.$2[0], 'art': c.$2[1]},
    ],
  },
});

// ---------------------------------------------------------------------------

/// Small heading inside a panel.
class PanelTitle extends StatelessWidget {
  final String title;
  final String? subtitle;
  const PanelTitle(this.title, {super.key, this.subtitle});

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: T.display(24)),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(subtitle!, style: T.body(14, color: C.inkSoft)),
        ],
      ]);
}

/// Avatar, name, throne record and the month titles.
class ProfileHeader extends StatelessWidget {
  final Map stats;
  final List<String> titles;
  final int elo;
  const ProfileHeader({super.key, required this.stats, required this.titles, required this.elo});

  @override
  Widget build(BuildContext context) {
    final name = stats['username'] as String? ?? '';
    final crowns = asInt(stats['crowns']), servant = asInt(stats['servant']);
    final tier = tierFor(elo);
    return Column(children: [
      Stack(clipBehavior: Clip.none, alignment: Alignment.center, children: [
        Container(
          decoration: BoxDecoration(shape: BoxShape.circle, boxShadow: [BoxShadow(color: C.gold.withValues(alpha: .28), blurRadius: 34, spreadRadius: 2)]),
          child: Avatar(name: name, url: stats['avatar_url'] as String?, size: 108, ring: C.gold),
        ),
        Positioned(
          right: -4, bottom: -2,
          child: Container(
            width: 40, height: 40, alignment: Alignment.center,
            decoration: BoxDecoration(shape: BoxShape.circle, color: C.velvet, border: Border.all(color: tier.color, width: 2.5)),
            child: Text(tier.emoji, style: const TextStyle(fontSize: 20)),
          ),
        ),
      ]).animate().scale(begin: const Offset(.85, .85), curve: Curves.easeOutBack, duration: 500.ms).fadeIn(),
      const SizedBox(height: 14),
      Text(name, style: T.display(42), textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
      const SizedBox(height: 4),
      Text(
        [
          crowns > 0 ? '$crowns× Großer Jakob gewesen' : 'Noch nie auf dem Thron gesessen',
          if (servant > 0) '$servant× Großer Knecht',
        ].join(' · '),
        style: T.body(15, color: C.inkSoft),
        textAlign: TextAlign.center,
      ),
      if (titles.isNotEmpty) ...[
        const SizedBox(height: 12),
        Wrap(alignment: WrapAlignment.center, spacing: 8, runSpacing: 8, children: [
          for (final t in titles) Pill('👑 $t', color: C.gold.withValues(alpha: .2), textColor: C.goldSoft),
        ]),
      ],
    ]);
  }
}

/// Elo tier and level progress.
class RatingPanel extends StatelessWidget {
  final Map? rating;
  const RatingPanel({super.key, required this.rating});

  @override
  Widget build(BuildContext context) {
    final elo = asInt(rating?['rating'] ?? 1000);
    final peak = asInt(rating?['peakRating'] ?? elo);
    final rated = asInt(rating?['ratedGames']);
    final xp = asInt(rating?['xp']);
    final tier = tierFor(elo);
    final next = tiers.where((t) => t.min > elo).firstOrNull;
    final level = levelFromXp(xp);
    final current = xp - xpForLevel(level), needed = xpForLevel(level + 1) - xpForLevel(level);
    final provisional = rated < 5;

    return Panel(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 60, height: 60, alignment: Alignment.center,
            decoration: BoxDecoration(shape: BoxShape.circle, color: tier.color.withValues(alpha: .2), border: Border.all(color: tier.color, width: 3)),
            child: Text(tier.emoji, style: const TextStyle(fontSize: 30)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('$elo${provisional ? '?' : ''}', style: T.display(38)),
              Text('${tier.name} · Elo', style: T.body(15, color: C.inkSoft, weight: FontWeight.w700)),
            ]),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('Bestwert $peak', style: T.label(13)),
            const SizedBox(height: 2),
            Text(rated == 1 ? '1 Partie' : '$rated Partien', style: T.body(13, color: C.inkMute)),
          ]),
        ]),
        if (next != null || provisional) ...[
          const SizedBox(height: 10),
          Text(
            [
              if (provisional) 'Vorläufig, bis 5 Partien gewertet sind',
              if (next != null) 'Noch ${next.min - elo} bis ${next.emoji} ${next.name}',
            ].join(' · '),
            style: T.body(13, color: C.inkMute),
          ),
        ],
        const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: Divider(height: 1, color: C.line)),
        Row(children: [
          Expanded(child: Text('Stufe $level · ${levelTitle(level)}', style: T.body(16, weight: FontWeight.w800, color: C.goldSoft))),
          Text('$current / $needed XP', style: T.label(13)),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: SizedBox(
            height: 10,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: levelFraction(xp).clamp(0, 1).toDouble()),
              duration: const Duration(milliseconds: 900),
              curve: Curves.easeOutCubic,
              builder: (_, v, _) => Stack(children: [
                Container(color: C.night),
                FractionallySizedBox(
                  widthFactor: v,
                  child: Container(decoration: const BoxDecoration(gradient: LinearGradient(colors: [C.goldDeep, C.gold]))),
                ),
              ]),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text('Noch ${needed - current} XP bis Stufe ${level + 1} · $xp XP insgesamt', style: T.body(13, color: C.inkMute)),
      ]),
    );
  }
}

/// Six key numbers in a 3 × 2 grid.
class StatTiles extends StatelessWidget {
  final Map stats;
  const StatTiles({super.key, required this.stats});

  @override
  Widget build(BuildContext context) {
    final games = asInt(stats['games_played']), wins = asInt(stats['wins']);
    final tiles = [
      ('🎴', '$games', 'Spiele'),
      ('🏆', '$wins', 'Siege'),
      ('📈', games == 0 ? '–' : '${(wins * 100 / games).round()} %', 'Siegquote'),
      ('👑', '${asInt(stats['crowns'])}', 'Kronen'),
      ('🎯', games == 0 ? '–' : deNum(asDouble(stats['avg_place'])), 'Ø Platz'),
      ('✊', '${asInt(stats['revolutions']) + asInt(stats['grand_revolutions'])}', 'Revolutionen'),
    ];
    Widget tile(int i) {
      final (emoji, value, label) = tiles[i];
      return Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
          decoration: BoxDecoration(color: C.surface, borderRadius: BorderRadius.circular(18), border: Border.all(color: C.line)),
          child: Column(children: [
            Text(emoji, style: const TextStyle(fontSize: 20)),
            const SizedBox(height: 4),
            FittedBox(fit: BoxFit.scaleDown, child: Text(value, style: T.display(30, color: C.goldSoft))),
            const SizedBox(height: 2),
            Text(label, style: T.label(12), maxLines: 1, overflow: TextOverflow.ellipsis),
          ]),
        ).animate(delay: (i * 50).ms).fadeIn(duration: 300.ms).moveY(begin: 10, end: 0),
      );
    }

    return Column(children: [
      for (final row in [0, 3]) ...[
        if (row > 0) const SizedBox(height: 10),
        Row(children: [tile(row), const SizedBox(width: 10), tile(row + 1), const SizedBox(width: 10), tile(row + 2)]),
      ],
    ]);
  }
}

/// Placement distribution, recent form and favourite card from `detailed`.
class DetailedStatsBlock extends StatelessWidget {
  final Map detailed;
  final bool isMe;
  const DetailedStatsBlock({super.key, required this.detailed, required this.isMe});

  @override
  Widget build(BuildContext context) {
    final places = asIntList(detailed['placeCounts']);
    final byRank = asIntList(detailed['byRank']);
    final trend = (detailed['trend'] as List?)?.whereType<Map>().toList() ?? const <Map>[];
    final total = places.fold(0, (a, b) => a + b);
    if (total == 0) return const SizedBox.shrink();

    final podium = places.take(3).fold(0, (a, b) => a + b);
    final played = byRank.fold(0, (a, b) => a + b);
    var fav = 0;
    for (var i = 1; i < byRank.length; i++) {
      if (byRank[i] > byRank[fav]) fav = i;
    }
    final recent = trend.length > 10 ? trend.sublist(trend.length - 10) : trend;
    final recentAvg = recent.isEmpty ? 0.0 : recent.map((p) => asInt(p['place'])).fold(0, (a, b) => a + b) / recent.length;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SectionTitle('Statistik'),
      Panel(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          PanelTitle('Platzierungen', subtitle: '${(podium * 100 / total).round()} % auf dem Treppchen, aus $total ${total == 1 ? 'Spiel' : 'Spielen'}'),
          const SizedBox(height: 14),
          BarChart(values: places, labels: [for (var i = 0; i < places.length; i++) '${i + 1}.']),
        ]),
      ),
      if (trend.length >= 3) ...[
        const SizedBox(height: 12),
        Panel(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            PanelTitle('Formkurve', subtitle: 'Punkte in den letzten ${trend.length} Spielen · zuletzt im Schnitt Platz ${deNum(recentAvg)}'),
            const SizedBox(height: 14),
            LineChart(values: [for (final p in trend) asInt(p['points'])]),
            const SizedBox(height: 6),
            Row(children: [
              Text(deDate(trend.first['finishedAt'] as String? ?? '', time: false), style: T.label(12, color: C.inkMute)),
              const Spacer(),
              Text('zuletzt', style: T.label(12, color: C.inkMute)),
            ]),
          ]),
        ),
      ],
      if (played > 0) ...[
        const SizedBox(height: 12),
        Panel(
          child: Row(children: [
            Transform.rotate(angle: -.06, child: PlayingCard(rank: fav + 1, deck: hofstaatDeck, width: 86)),
            const SizedBox(width: 18),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('LIEBLINGSKARTE', style: T.label(12, color: C.inkMute).copyWith(letterSpacing: 1.4)),
                const SizedBox(height: 4),
                Text(rankNames[fav + 1] ?? '${fav + 1}', style: T.display(30, color: C.goldSoft)),
                const SizedBox(height: 6),
                Text(
                  '${byRank[fav]}× gelegt, ${(byRank[fav] * 100 / played).round()} % ${isMe ? 'deiner' : 'aller'} Karten',
                  style: T.body(14, color: C.inkSoft),
                ),
              ]),
            ),
          ]),
        ),
      ],
    ]);
  }
}

/// Earned badges shine, the rest wait dimmed with their hint.
class BadgeGrid extends StatelessWidget {
  final List<Map> badges;
  const BadgeGrid({super.key, required this.badges});

  static const _grey = ColorFilter.matrix([
    .33, .33, .33, 0, 0, //
    .33, .33, .33, 0, 0, //
    .33, .33, .33, 0, 0, //
    0, 0, 0, 1, 0,
  ]);

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final w = (c.maxWidth - 10) / 2;
        return Wrap(spacing: 10, runSpacing: 10, children: [
          for (final (i, b) in badges.indexed) SizedBox(width: w, child: _badge(b, i)),
        ]);
      });

  Widget _badge(Map b, int i) {
    final earned = b['earned'] == true;
    final emoji = Text(b['emoji'] as String? ?? '⭐', style: const TextStyle(fontSize: 30));
    return Container(
      constraints: const BoxConstraints(minHeight: 128),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: earned ? C.gold.withValues(alpha: .14) : C.velvet.withValues(alpha: .7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: earned ? C.gold.withValues(alpha: .6) : C.line),
        boxShadow: earned ? [BoxShadow(color: C.gold.withValues(alpha: .12), blurRadius: 16)] : null,
      ),
      child: Opacity(
        opacity: earned ? 1 : .5,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            earned ? emoji : ColorFiltered(colorFilter: _grey, child: emoji),
            const Spacer(),
            Icon(earned ? Icons.check_circle_rounded : Icons.lock_outline_rounded, size: 18, color: earned ? C.gold : C.inkMute),
          ]),
          const SizedBox(height: 8),
          Text(b['title'] as String? ?? '', style: T.body(16, weight: FontWeight.w800, color: earned ? C.ink : C.inkSoft)),
          const SizedBox(height: 2),
          Text(b['hint'] as String? ?? '', style: T.body(13, color: C.inkSoft, height: 1.2)),
        ]),
      ),
    ).animate(delay: (i * 40).ms).fadeIn(duration: 300.ms);
  }
}

/// Head-to-head records with a W:L chip.
class RivalList extends StatelessWidget {
  final List<Map> rivals;
  final void Function(String username) onOpen;
  const RivalList({super.key, required this.rivals, required this.onOpen});

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (final r in rivals) ...[
          _row(r),
          const SizedBox(height: 8),
        ],
        Text('Gezählt wird, wer im gemeinsamen Spiel vor dem anderen landete.', style: T.body(13, color: C.inkMute)),
      ]);

  Widget _row(Map r) {
    final p = Profile.from(r['profile'] as Map? ?? const {});
    final games = asInt(r['games']), wins = asInt(r['wins']), losses = asInt(r['losses']);
    final lead = wins - losses;
    final color = lead > 0 ? C.vert : lead < 0 ? C.wax : C.inkSoft;
    return Panel(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      onTap: () => onOpen(p.username),
      child: Row(children: [
        Avatar.of(p, size: 44),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p.username, style: T.body(17, weight: FontWeight.w800), overflow: TextOverflow.ellipsis),
            Text(games == 1 ? '1 Spiel zusammen' : '$games Spiele zusammen', style: T.body(13, color: C.inkSoft)),
          ]),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(color: color.withValues(alpha: .16), borderRadius: BorderRadius.circular(14)),
          child: Text('$wins : $losses', style: T.display(24, color: color)),
        ),
      ]),
    );
  }
}

/// Recent games: one compact line each, tap to see the full standings.
class HistoryList extends StatelessWidget {
  final List<Map> games;
  final String userId;
  final void Function(String username) onOpen;
  const HistoryList({super.key, required this.games, required this.userId, required this.onOpen});

  @override
  Widget build(BuildContext context) => Column(children: [
        for (final g in games)
          Padding(padding: const EdgeInsets.only(bottom: 8), child: _HistoryTile(game: g, userId: userId, onOpen: onOpen)),
      ]);
}

class _Seat {
  final String name;
  final String? avatarUrl, emoji;
  final int? place;
  final int points;
  final bool left, self, bot;
  const _Seat(this.name, this.avatarUrl, this.emoji, this.place, this.points, {this.left = false, this.self = false, this.bot = false});
}

class _HistoryTile extends StatefulWidget {
  final Map game;
  final String userId;
  final void Function(String username) onOpen;
  const _HistoryTile({required this.game, required this.userId, required this.onOpen});

  @override
  State<_HistoryTile> createState() => _HistoryTileState();
}

class _HistoryTileState extends State<_HistoryTile> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final g = widget.game;
    final seats = <_Seat>[
      for (final p in (g['players'] as List? ?? const []).whereType<Map>())
        _Seat(
          (p['profile'] as Map?)?['username'] as String? ?? '?', (p['profile'] as Map?)?['avatar_url'] as String?, null,
          p['place'] == null ? null : asInt(p['place']), asInt(p['points']),
          left: p['left'] == true, self: (p['profile'] as Map?)?['id'] == widget.userId,
        ),
      for (final b in (g['bots'] as List? ?? const []).whereType<Map>())
        _Seat(b['name'] as String? ?? 'Bot', null, b['emoji'] as String? ?? '🤖', asInt(b['place']), asInt(b['points']), bot: true),
    ]..sort((a, b) => (a.place ?? 99).compareTo(b.place ?? 99));
    final me = seats.where((s) => s.self).firstOrNull;
    final rounds = asInt(g['rounds']);
    final won = me?.place == 1;

    return Panel(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      glow: won,
      onTap: () => setState(() => _open = !_open),
      child: AnimatedSize(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        alignment: Alignment.topCenter,
        child: Column(children: [
          Row(children: [
            SizedBox(
              width: 40,
              child: Text(placeMedal(me?.place), textAlign: TextAlign.center, style: (me?.place ?? 9) <= 3 ? const TextStyle(fontSize: 26) : T.display(24, color: C.inkSoft)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                  me?.place != null ? 'Platz ${me!.place} von ${seats.length}' : (me?.left ?? false) ? 'Vorzeitig gegangen' : '${seats.length} am Tisch',
                  style: T.body(16, weight: FontWeight.w800),
                ),
                Text('${deDate(g['finishedAt'] as String? ?? '')} · ${rounds == 1 ? '1 Runde' : '$rounds Runden'}', style: T.body(13, color: C.inkSoft)),
              ]),
            ),
            if (me != null) ...[
              Text('${me.points}', style: T.display(26, color: C.goldSoft)),
              const SizedBox(width: 4),
            ],
            AnimatedRotation(
              turns: _open ? .5 : 0,
              duration: const Duration(milliseconds: 220),
              child: const Icon(Icons.expand_more_rounded, color: C.inkMute),
            ),
          ]),
          if (_open) ...[
            const SizedBox(height: 10),
            for (final s in seats)
              InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: s.bot || s.self ? null : () => widget.onOpen(s.name),
                child: Container(
                  margin: const EdgeInsets.only(top: 2),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(color: s.self ? C.gold.withValues(alpha: .16) : null, borderRadius: BorderRadius.circular(12)),
                  child: Opacity(
                    opacity: s.left ? .5 : 1,
                    child: Row(children: [
                      SizedBox(width: 30, child: Text(placeMedal(s.place), textAlign: TextAlign.center, style: T.body(15, weight: FontWeight.w800))),
                      const SizedBox(width: 8),
                      Avatar(name: s.name, url: s.avatarUrl, emoji: s.emoji, size: 30),
                      const SizedBox(width: 10),
                      Expanded(child: Text(s.name, style: T.body(15, weight: FontWeight.w700), overflow: TextOverflow.ellipsis)),
                      Text('${s.points}', style: T.display(20)),
                    ]),
                  ),
                ),
              ),
          ],
        ]),
      ),
    );
  }
}

/// Shimmering placeholder while the profile loads.
class ProfileSkeleton extends StatelessWidget {
  const ProfileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    Widget block(double h, {double? w, double r = 22}) =>
        Container(height: h, width: w, decoration: BoxDecoration(color: C.surface, borderRadius: BorderRadius.circular(r)));
    return Column(children: [
      block(108, w: 108, r: 99),
      const SizedBox(height: 16),
      block(36, w: 180, r: 12),
      const SizedBox(height: 24),
      block(170),
      const SizedBox(height: 12),
      block(190),
    ])
        .animate(onPlay: (c) => c.repeat())
        .shimmer(duration: 1400.ms, color: C.surfaceHi);
  }
}
