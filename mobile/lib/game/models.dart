import 'rules.dart';

List<int> _ints(dynamic v) => v is List ? v.map((e) => (e as num).toInt()).toList() : <int>[];
List<String> _strs(dynamic v) => v is List ? v.map((e) => e as String).toList() : <String>[];
Map<String, dynamic> _map(dynamic v) => v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};

class Bot {
  final String name, emoji, level;
  const Bot(this.name, this.emoji, this.level);
}

class Player {
  final String id;
  final bool left, autopilot;
  final String? deckId;
  final Bot? bot;
  const Player(this.id, this.left, this.deckId, this.bot, this.autopilot);

  factory Player.from(Map m) {
    final b = m['bot'];
    return Player(
      m['id'] as String, m['left'] == true, m['deckId'] as String?,
      b is Map ? Bot(b['name'] as String? ?? 'Bot', b['emoji'] as String? ?? '🤖', b['level'] as String? ?? 'easy') : null,
      m['autopilot'] == true,
    );
  }
}

class TaxPair {
  final String from, to;
  final int count;
  final bool done;
  const TaxPair(this.from, this.to, this.count, this.done);
}

class RoundResult {
  final int round;
  final List<String> start, finish;
  final Map<String, int> points;
  final String? event;
  final String revolution;
  const RoundResult(this.round, this.start, this.finish, this.points, this.event, this.revolution);
}

/// The public game state as stored in games.state (read-only view over the JSON).
class GameState {
  final Map<String, dynamic> raw;
  GameState(this.raw);

  String get status => raw['status'] as String? ?? 'lobby';
  String get hostId => raw['hostId'] as String? ?? '';
  String? get phase => raw['phase'] as String?;
  int get round => (raw['round'] as num?)?.toInt() ?? 0;
  int get moveSeq => (raw['moveSeq'] as num?)?.toInt() ?? 0;
  String? get turn => raw['turn'] as String?;
  String get mode => raw['mode'] as String? ?? 'normal';
  String? get modeRef => raw['modeRef'] as String?;
  String? get event => raw['event'] as String?;
  String? get deadline => raw['deadline'] as String?;
  String? get autoStartAt => raw['autoStartAt'] as String?;
  Map<String, dynamic> get settings => _map(raw['settings']);
  int get rounds => (settings['rounds'] as num?)?.toInt() ?? 5;
  int? get goal => (settings['goal'] as num?)?.toInt();
  bool setting(String key) => settings[key] == true;

  List<Player> get players => ((raw['players'] as List?) ?? const []).map((p) => Player.from(p as Map)).toList();
  Player? player(String id) => players.where((p) => p.id == id).firstOrNull;
  List<String> get order => _strs(raw['order']);
  List<String> get ready => _strs(raw['ready']);
  List<String> get passed => _strs(raw['passed']);
  List<String> get finished => _strs(raw['finished']);
  List<int> get played => _ints(raw['played']);
  Map<String, int> get handCounts => _map(raw['handCounts']).map((k, v) => MapEntry(k, (v as num).toInt()));
  Map<String, int> get points => _map(raw['points']).map((k, v) => MapEntry(k, (v as num).toInt()));
  Map<String, int> get draws => _map(raw['draws']).map((k, v) => MapEntry(k, (v as num).toInt()));
  Map<String, int>? get teams => raw['teams'] is Map ? _map(raw['teams']).map((k, v) => MapEntry(k, (v as num).toInt())) : null;
  TrickInfo? get trick => TrickInfo.from(raw['trick']);
  Map? get revolution => raw['revolution'] as Map?;
  Map? get audit => raw['audit'] as Map?;
  String? get throneWinner => raw['throneWinner'] as String?;
  List<Map> get log => ((raw['log'] as List?) ?? const []).cast<Map>();
  List<TaxPair> get tax => ((raw['tax'] as List?) ?? const [])
      .map((t) => TaxPair(t['from'] as String, t['to'] as String, (t['count'] as num).toInt(), t['done'] == true))
      .toList();
  List<RoundResult> get history => ((raw['history'] as List?) ?? const []).map((h) {
        final m = h as Map;
        return RoundResult(
          (m['round'] as num?)?.toInt() ?? 0, _strs(m['start']), _strs(m['finish']),
          _map(m['points']).map((k, v) => MapEntry(k, (v as num).toInt())), m['event'] as String?,
          m['revolution'] as String? ?? 'none',
        );
      }).toList();
  Map<String, dynamic>? get missionsRevealed => raw['missionsRevealed'] is Map ? _map(raw['missionsRevealed']) : null;

  RuleCtx get ctx => RuleCtx(snap: setting('snap'), bomb: setting('bomb'), event: event);

  int get maxPlayers => setting('doubleDeck') ? 12 : 8;

  /// Final places (port of the engine's placements).
  Map<String, int> placements() {
    final last = history.isNotEmpty ? history.last.finish : <String>[];
    int pos(String id) {
      final i = last.indexOf(id);
      return i < 0 ? 99 : i;
    }

    final pts = points;
    final t = teams;
    if (t != null) {
      var a = 0, b = 0;
      for (final p in players) {
        if (p.left || t[p.id] == null) continue;
        if (t[p.id] == 0) {
          a += pts[p.id] ?? 0;
        } else {
          b += pts[p.id] ?? 0;
        }
      }
      final winners = a == b ? {0, 1} : a > b ? {0} : {1};
      return {for (final p in players) p.id: p.left || t[p.id] == null ? 3 : winners.contains(t[p.id]) ? 1 : 2};
    }
    final throne = throneWinner;
    final ranked = [...players]..sort((a, b) {
        int c = (a.left ? 1 : 0) - (b.left ? 1 : 0);
        if (c != 0) return c;
        c = (b.id == throne ? 1 : 0) - (a.id == throne ? 1 : 0);
        if (c != 0) return c;
        c = (pts[b.id] ?? 0) - (pts[a.id] ?? 0);
        if (c != 0) return c;
        return pos(a.id) - pos(b.id);
      });
    final places = <String, int>{};
    for (var i = 0; i < ranked.length; i++) {
      final p = ranked[i];
      final prev = i > 0 ? ranked[i - 1] : null;
      final tied = prev != null && !p.left && !prev.left && prev.id != throne &&
          (pts[prev.id] ?? 0) == (pts[p.id] ?? 0) && pos(prev.id) == pos(p.id);
      places[p.id] = tied ? places[prev.id]! : i + 1;
    }
    return places;
  }
}

class GameView {
  final String id, code;
  final int version;
  final GameState state;
  final String? rematchGameId;
  const GameView(this.id, this.code, this.version, this.state, this.rematchGameId);

  factory GameView.from(Map m) => GameView(
        m['id'] as String, m['code'] as String, (m['version'] as num).toInt(),
        GameState(_map(m['state'])), (m['rematchGameId'] ?? m['rematch_game_id']) as String?,
      );
}

class Hand {
  final List<int> cards, received, gave;
  final Map? mission;
  final int version;
  const Hand(this.cards, this.received, this.gave, this.mission, this.version);
  static const empty = Hand([], [], [], null, -1);

  factory Hand.from(Map m, int version) =>
      Hand(_ints(m['cards']), _ints(m['received']), _ints(m['gave']), m['mission'] as Map?, version);
}

class Profile {
  final String id, username;
  final String? avatarUrl, frame;
  /// Equipped loot cosmetics by kind (rahmen, wappen, rueckseite, filz).
  final Map<String, String> loot;
  const Profile(this.id, this.username, this.avatarUrl, this.frame, [this.loot = const {}]);
  factory Profile.from(Map m) => Profile(
        m['id'] as String? ?? m['user_id'] as String? ?? '', m['username'] as String? ?? '?', m['avatar_url'] as String?, m['avatar_frame'] as String?,
        m['loot_equipped'] is Map ? (m['loot_equipped'] as Map).map((k, v) => MapEntry(k as String, v as String)) : const {},
      );

  String? get lootFrame => loot['rahmen'];
  String? get lootEmblem => loot['wappen'];
  String? get lootBack => loot['rueckseite'];
  String? get lootFelt => loot['filz'];
}

class CardFace {
  final String name, emoji;
  final String? art, image;
  /// Free layout from the card editor (see widgets/card_layout.dart); null = the deck's standard look.
  final Map<String, dynamic>? layout;
  const CardFace(this.name, this.emoji, this.art, this.image, [this.layout]);
}

/// A deck design (preset or custom) as sent by the server.
class Deck {
  final String id, name;
  final String frame, accent, paper, ink, font, photoFit;
  final List<CardFace> cards;
  final Map<String, dynamic> back;
  /// The design JSON as stored, so the editor can change it without dropping fields it does not know.
  final Map<String, dynamic> design;
  const Deck(this.id, this.name, this.frame, this.accent, this.paper, this.ink, this.font, this.photoFit, this.cards, this.back,
      [this.design = const {}]);

  factory Deck.from(Map m) => Deck.fromDesign(m['id'] as String, m['name'] as String? ?? 'Deck', _map(m['design']));

  /// A deck from a raw design map (also the editor's working copy).
  factory Deck.fromDesign(String id, String name, Map<String, dynamic> d) => Deck(
        id, name,
        d['frame'] as String? ?? '#6b1e2e', d['accent'] as String? ?? '#f4b73a', d['paper'] as String? ?? '#fbf0d9',
        d['ink'] as String? ?? '#2b1a12', d['font'] as String? ?? 'gotisch', d['photoFit'] as String? ?? 'medaillon',
        ((d['cards'] as List?) ?? const []).map((c) {
          final cm = c as Map;
          return CardFace(cm['name'] as String? ?? '', cm['emoji'] as String? ?? '', cm['art'] as String?, cm['image'] as String?,
              cm['layout'] is Map ? _map(cm['layout']) : null);
        }).toList(),
        _map(d['back']),
        d,
      );

  CardFace face(int rank) =>
      rank >= 1 && rank <= cards.length ? cards[rank - 1] : CardFace(rankNames[rank] ?? '$rank', '🃏', null, null);
}
