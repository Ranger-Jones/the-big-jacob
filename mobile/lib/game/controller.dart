import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api.dart';
import 'models.dart';
import 'rules.dart';

class EmojiEvent {
  final String id, emoji, from;
  EmojiEvent(this.id, this.emoji, this.from);
}

class ChatMessage {
  final String id, userId, body;
  final DateTime at;
  ChatMessage(this.id, this.userId, this.body, this.at);
}

/// Same catalogue as the web (lib/emojis.ts): only these are sent and shown.
const allowedEmojis = [
  '👑', '😂', '😱', '🔥', '👏', '🃏',
  '😀', '🤣', '😊', '😍', '🥳', '😎', '🤩', '😜', '🤪', '😏', '😅', '😬', '🙃', '😇',
  '🤔', '🤨', '😴', '😤', '😡', '🤯', '🥶', '🥵', '😈', '💀', '🤡', '👻', '🙈', '🫠',
  '🙌', '👍', '👎', '🤞', '✌️', '💪', '🙏', '👀', '🫡', '💯', '✨', '⭐', '🏆', '🥇',
  '🏰', '⚔️', '🛡️', '🍀', '💸', '❤️', '💔', '💥', '🚑', '🐐', '🍻', '🧹',
];

/// Live state of one table: realtime updates, own hand, presence, chat and the automation driver
/// (the first online human nudges the server for bots and expired timers, like the web client).
class GameController extends ChangeNotifier {
  final String me;
  final SupabaseClient _sb = Supabase.instance.client;

  GameView? game;
  Hand hand = Hand.empty;
  final Map<String, Profile> profiles = {};
  final Map<String, Deck> decks = {};
  List<Profile> friends = [];
  List<Deck> myDecks = [];
  List<String> quickEmojis = allowedEmojis.take(6).toList();
  Set<String> online = {};
  bool connected = true, busy = false, gone = false, kicked = false;
  /// Watching a friend's game: no seat, no hand, reactions only.
  bool spectating = false;
  final List<EmojiEvent> emojis = [];
  final List<ChatMessage> chat = [];
  int unreadChat = 0;
  bool chatOpen = false;
  Duration clockOffset = Duration.zero;
  String? lastError;

  RealtimeChannel? _channel, _chatChannel;
  Timer? _botTimer, _deadlineTimer, _autoStartTimer;
  int _lastEmoji = 0;
  final _rand = math.Random();

  GameController(this.me);

  GameState? get state => game?.state;

  String nameOf(String id, {bool you = false}) {
    if (you && id == me) return 'Du';
    final p = state?.player(id);
    return p?.bot?.name ?? profiles[id]?.username ?? '…';
  }

  Deck? deckOf(String id) => decks[id];

  /// People watching right now: present on the table channel but not seated.
  List<String> get spectators => [for (final id in online) if (state?.player(id) == null && id != me) id];

  /// Opens the table by code (joins if needed, or watches with [spectate]). Returns an error message or null.
  Future<String?> open(String code, {bool spectate = false}) async {
    spectating = spectate;
    final res = await Api.get(spectate ? 'spectate/$code' : 'game/$code');
    if (!res.ok) return res.error;
    _load(res.data as Map);
    await _subscribe();
    return null;
  }

  void _load(Map data) {
    final view = GameView.from(data['view'] as Map);
    game = view;
    hand = Hand.from(data['hand'] as Map, view.version);
    (data['profiles'] as Map).forEach((k, v) => profiles[k as String] = Profile.from(v as Map));
    (data['decks'] as Map).forEach((k, v) => decks[k as String] = Deck.from(v as Map));
    friends = ((data['friends'] as List?) ?? const []).map((f) => Profile.from(f as Map)).toList();
    myDecks = ((data['myDecks'] as List?) ?? const []).map((d) => Deck.from(d as Map)).toList();
    final q = (data['quickEmojis'] as List?)?.cast<String>();
    if (q != null && q.isNotEmpty) quickEmojis = q;
    clockOffset = Duration(milliseconds: (data['serverNow'] as num).toInt() - DateTime.now().millisecondsSinceEpoch);
    online = {me};
    _schedule();
    notifyListeners();
  }

  Future<void> _subscribe() async {
    final id = game!.id;
    final ch = _sb.channel('game:$id', opts: RealtimeChannelConfig(private: true, key: me));
    _channel = ch;
    ch
        .onPostgresChanges(
          event: PostgresChangeEvent.update, schema: 'public', table: 'games',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'id', value: id),
          callback: (payload) {
            final row = payload.newRecord;
            if (row['state'] == null) {
              if (game != null) {
                game = GameView(game!.id, game!.code, game!.version, game!.state, row['rematch_game_id'] as String? ?? game!.rematchGameId);
                notifyListeners();
              }
              return;
            }
            _apply(GameView.from(row));
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.delete, schema: 'public', table: 'games',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'id', value: id),
          callback: (_) {
            gone = true;
            notifyListeners();
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all, schema: 'public', table: 'game_hands',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'game_id', value: id),
          callback: (payload) {
            final row = payload.newRecord;
            if (row['user_id'] == me && row['hand'] is Map) _applyHand(row['hand'] as Map, (row['version'] as num?)?.toInt() ?? 0);
          },
        )
        .onBroadcast(event: 'emoji', callback: (message) {
          final payload = broadcastBody(message);
          final from = payload['from'], emoji = payload['emoji'], eid = payload['id'];
          if (from is! String || emoji is! String || eid is! String || !allowedEmojis.contains(emoji)) return;
          // Broadcasts are unauthenticated: only accept senders present on the channel.
          if (!online.contains(from)) return;
          _pushEmoji(EmojiEvent(eid, emoji, from));
        })
        .onBroadcast(event: 'kicked', callback: (message) {
          if (broadcastBody(message)['userId'] != me) return;
          kicked = true;
          refetch();
        })
        .onPresenceSync((_) {
          final ids = <String>{me};
          for (final s in ch.presenceState()) {
            ids.add(s.key);
          }
          online = ids;
          _schedule();
          notifyListeners();
        })
        .subscribe((status, error) async {
          if (status == RealtimeSubscribeStatus.subscribed) {
            connected = true;
            await ch.track({'at': DateTime.now().millisecondsSinceEpoch});
            await refetch();
          } else if (status == RealtimeSubscribeStatus.channelError || status == RealtimeSubscribeStatus.timedOut) {
            connected = false;
            notifyListeners();
          }
        });
    await _subscribeChat(id);
  }

  Future<void> _subscribeChat(String id) async {
    final rows = await _sb.from('game_messages').select('id, user_id, body, created_at').eq('game_id', id).order('created_at').limit(100);
    chat
      ..clear()
      ..addAll(rows.map((r) => ChatMessage(r['id'].toString(), r['user_id'] as String, r['body'] as String, DateTime.parse(r['created_at'] as String))));
    _chatChannel = _sb.channel('chat:$id').onPostgresChanges(
      event: PostgresChangeEvent.insert, schema: 'public', table: 'game_messages',
      filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'game_id', value: id),
      callback: (payload) {
        final r = payload.newRecord;
        if (chat.any((m) => m.id == r['id'].toString())) return;
        chat.add(ChatMessage(r['id'].toString(), r['user_id'] as String, r['body'] as String, DateTime.parse(r['created_at'] as String)));
        if (!chatOpen && r['user_id'] != me) unreadChat++;
        notifyListeners();
      },
    )..subscribe();
    notifyListeners();
  }

  void _apply(GameView next) {
    final cur = game;
    if (cur == null || next.version > cur.version || next.rematchGameId != cur.rematchGameId) {
      game = next;
      _schedule();
      notifyListeners();
    }
  }

  void _applyHand(Map raw, int version) {
    if (version >= hand.version) {
      hand = Hand.from(raw, version);
      notifyListeners();
    }
  }

  Future<void> refetch() async {
    final id = game?.id;
    if (id == null) return;
    try {
      final row = await _sb.from('games').select('id, code, version, state, rematch_game_id').eq('id', id).maybeSingle();
      final own = await _sb.from('game_hands').select('hand, version').eq('game_id', id).eq('user_id', me).maybeSingle();
      if (row == null) {
        gone = true;
      } else {
        final view = GameView.from(row);
        if (game == null || view.version >= game!.version) game = view;
        if (own != null) _applyHand(own['hand'] as Map, (own['version'] as num).toInt());
        await _loadMissing();
      }
      _schedule();
      notifyListeners();
    } catch (_) {
      // Offline for a moment; the next realtime event or resume brings us back.
    }
  }

  /// Profiles and decks of players who joined after we opened the table.
  Future<void> _loadMissing() async {
    final s = state;
    if (s == null) return;
    final missing = s.players.where((p) => p.bot == null && !profiles.containsKey(p.id)).map((p) => p.id).toList();
    if (missing.isNotEmpty) {
      final rows = await _sb.from('profiles').select('id, username, avatar_url, avatar_frame').inFilter('id', missing);
      for (final r in rows) {
        profiles[r['id'] as String] = Profile.from(r);
      }
    }
    final noDeck = s.players.where((p) => !decks.containsKey(p.id) || (p.deckId != null && decks[p.id]!.id != p.deckId)).toList();
    if (noDeck.isNotEmpty) {
      // Re-opening resolves presets and custom decks on the server in one go.
      // Spectators must never go through 'game/', which would seat them at a table still in the lobby.
      final res = await Api.get(spectating ? 'spectate/${game!.code}' : 'game/${game!.code}');
      if (res.ok) {
        ((res.data as Map)['decks'] as Map).forEach((k, v) => decks[k as String] = Deck.from(v as Map));
      }
    }
  }

  /// Shows my own play or pass immediately; the server answer replaces it.
  void _optimistic(Map<String, dynamic> action) {
    final cur = game;
    if (cur == null || cur.state.phase != 'play' || cur.state.turn != me) return;
    final raw = Map<String, dynamic>.from(cur.state.raw);
    if (action['type'] == 'play') {
      final cards = (action['cards'] as List).cast<int>();
      if (judgePlay(cards, cur.state.trick, cur.state.ctx) != null) return;
      final shape = playShape(cards)!;
      raw['trick'] = {'cards': [...cards]..sort(), 'rank': effectiveRank(shape, cur.state.ctx), 'count': cards.length, 'by': me, 'seq': cur.state.moveSeq + 1};
      raw['turn'] = null;
      final counts = Map<String, dynamic>.from(raw['handCounts'] as Map? ?? {});
      counts[me] = ((counts[me] as num?) ?? 0) - cards.length;
      raw['handCounts'] = counts;
      hand = Hand(removeCards(hand.cards, cards), hand.received, hand.gave, hand.mission, hand.version);
    } else if (action['type'] == 'pass') {
      raw['passed'] = [...cur.state.passed, me];
      raw['turn'] = null;
    } else {
      return;
    }
    game = GameView(cur.id, cur.code, cur.version, GameState(raw), cur.rematchGameId);
    notifyListeners();
  }

  /// versioned: only for exactly this version (lobby); move: only for this move sequence (in game).
  Future<bool> dispatch(Map<String, dynamic> action, {bool versioned = false, bool move = false, bool silent = false}) async {
    final cur = game;
    if (cur == null) return false;
    final expected = move ? {'moveSeq': cur.state.moveSeq} : versioned ? cur.version : null;
    if (!silent) {
      busy = true;
      notifyListeners();
    }
    _optimistic(action);
    final res = await Api.post('action/${cur.id}', {'action': action, 'expected': ?expected});
    if (!silent) busy = false;
    if (res.ok) {
      final d = res.data as Map;
      final version = (d['version'] as num).toInt();
      if (game == null || version >= game!.version) {
        game = GameView(cur.id, cur.code, version, GameState(Map<String, dynamic>.from(d['state'] as Map)), game?.rematchGameId ?? cur.rematchGameId);
      }
      _applyHand(d['hand'] as Map, version);
      _schedule();
      notifyListeners();
      // New bots or a changed deck need their deck design.
      if (action['type'] == 'addBot' || action['type'] == 'setDeck') _loadMissing().then((_) => notifyListeners());
      return true;
    }
    await refetch();
    if (!silent && res.error != 'STALE') lastError = res.error;
    notifyListeners();
    return false;
  }

  void sendEmoji(String emoji) {
    final now = DateTime.now().millisecondsSinceEpoch;
    if (now - _lastEmoji < 700) return;
    _lastEmoji = now;
    final e = EmojiEvent('$me-$now', emoji, me);
    _pushEmoji(e);
    // Wrapped in "payload" like supabase-js sends it, so web clients receive app reactions (see broadcastBody).
    _channel?.sendBroadcastMessage(event: 'emoji', payload: {'payload': {'id': e.id, 'emoji': emoji, 'from': me}});
  }

  void _pushEmoji(EmojiEvent e) {
    emojis.add(e);
    if (emojis.length > 15) emojis.removeAt(0);
    notifyListeners();
    Timer(const Duration(milliseconds: 2600), () {
      emojis.remove(e);
      notifyListeners();
    });
  }

  Future<String?> sendChat(String body) async {
    final res = await Api.post('chat/${game!.id}', {'body': body});
    return res.ok ? null : res.error;
  }

  void markChatRead(bool open) {
    chatOpen = open;
    if (open) unreadChat = 0;
    notifyListeners();
  }

  // --- automation driver ----------------------------------------------------------------------

  int get _driverRank {
    final s = state;
    if (s == null) return -1;
    final humans = s.players.where((p) => p.bot == null && !p.left && online.contains(p.id)).map((p) => p.id).toList();
    return humans.indexOf(me);
  }

  DateTime get serverNow => DateTime.now().add(clockOffset);

  void _schedule() {
    _botTimer?.cancel();
    _deadlineTimer?.cancel();
    _autoStartTimer?.cancel();
    final s = state;
    final rank = _driverRank;
    if (s == null || rank < 0) return;
    final seq = s.moveSeq;

    final turn = s.turn;
    final turnPlayer = turn != null ? s.player(turn) : null;
    if (s.status == 'playing' && s.phase == 'play' && turnPlayer != null && (turnPlayer.bot != null || turnPlayer.autopilot)) {
      void fire() {
        dispatch({'type': 'botMove'}, move: true, silent: true).then((ok) {
          if (!ok && state?.moveSeq == seq) _botTimer = Timer(const Duration(milliseconds: 2500), fire);
        });
      }
      _botTimer = Timer(Duration(milliseconds: 850 + _rand.nextInt(600) + rank * 2500), fire);
    }

    final deadline = s.deadline != null ? DateTime.tryParse(s.deadline!) : null;
    if (deadline != null && s.status == 'playing') {
      final wait = deadline.difference(serverNow) + Duration(milliseconds: 1200 + rank * 2000);
      void fire() {
        dispatch({'type': 'timeout'}, move: true, silent: true).then((ok) {
          if (!ok && state?.moveSeq == seq) _deadlineTimer = Timer(const Duration(seconds: 2), fire);
        });
      }
      _deadlineTimer = Timer(wait.isNegative ? Duration.zero : wait, fire);
    }

    final autoStart = s.mode == 'public' && s.status == 'lobby' && s.autoStartAt != null ? DateTime.tryParse(s.autoStartAt!) : null;
    if (autoStart != null) {
      final full = s.players.where((p) => p.bot == null).length >= 6; // PUBLIC_MAX_HUMANS
      final wait = full ? const Duration(milliseconds: 800) : autoStart.difference(serverNow) + Duration(milliseconds: 800 + rank * 2000);
      void fire() {
        dispatch({'type': 'autoStart'}, silent: true).then((ok) {
          if (!ok && state?.status == 'lobby') _autoStartTimer = Timer(const Duration(seconds: 2), fire);
        });
      }
      _autoStartTimer = Timer(wait.isNegative ? Duration.zero : wait, fire);
    }
  }

  @override
  void dispose() {
    _botTimer?.cancel();
    _deadlineTimer?.cancel();
    _autoStartTimer?.cancel();
    if (_channel != null) _sb.removeChannel(_channel!);
    if (_chatChannel != null) _sb.removeChannel(_chatChannel!);
    super.dispose();
  }
}

/// The fields of a broadcast. supabase-js nests them under "payload"; the Dart client puts whatever map
/// it is given at the top level of the message. App builds before the fix sent them unwrapped, so both
/// shapes are accepted.
Map broadcastBody(Map message) => message['payload'] is Map ? message['payload'] as Map : message;
