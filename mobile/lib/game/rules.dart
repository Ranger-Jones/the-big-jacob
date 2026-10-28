// Client-side port of the rules the app needs for display: card names, legal plays (to dim cards),
// rank titles and log lines. The server stays authoritative for every move.

const jester = 13;

const rankNames = {
  1: 'Der Große Jakob', 2: 'Erzbischof', 3: 'Hofmarschall', 4: 'Baronin', 5: 'Äbtissin', 6: 'Ritter',
  7: 'Näherin', 8: 'Maurer', 9: 'Köchin', 10: 'Schäferin', 11: 'Steinmetz', 12: 'Bauer', 13: 'Narr',
};

const _numberWords = {
  1: 'Eins', 2: 'Zwei', 3: 'Drei', 4: 'Vier', 5: 'Fünf', 6: 'Sechs', 7: 'Sieben',
  8: 'Acht', 9: 'Neun', 10: 'Zehn', 11: 'Elf', 12: 'Zwölf', 13: 'Narr',
};

String rankWord(int rank) => _numberWords[rank] ?? '$rank';

Map<int, int> countBy(Iterable<int> cards) {
  final m = <int, int>{};
  for (final c in cards) {
    m[c] = (m[c] ?? 0) + 1;
  }
  return m;
}

List<int> removeCards(List<int> whole, List<int> part) {
  final rest = [...whole];
  for (final c in part) {
    rest.remove(c);
  }
  return rest;
}

class Shape {
  final int rank, count, jesters;
  const Shape(this.rank, this.count, this.jesters);
}

Shape? playShape(List<int> cards) {
  if (cards.isEmpty || cards.any((c) => c < 1 || c > jester)) return null;
  final naturals = cards.where((c) => c != jester).toList();
  final rank = naturals.isNotEmpty ? naturals.first : jester;
  if (naturals.any((c) => c != rank)) return null;
  return Shape(rank, cards.length, cards.length - naturals.length);
}

class TrickInfo {
  final List<int> cards;
  final int rank, count, seq;
  final String by;
  const TrickInfo(this.cards, this.rank, this.count, this.by, this.seq);

  static TrickInfo? from(dynamic m) {
    if (m is! Map) return null;
    return TrickInfo(
      (m['cards'] as List).map((e) => (e as num).toInt()).toList(),
      (m['rank'] as num).toInt(), (m['count'] as num).toInt(), m['by'] as String, (m['seq'] as num?)?.toInt() ?? 0,
    );
  }
}

class RuleCtx {
  final bool snap, bomb;
  final String? event;
  const RuleCtx({this.snap = false, this.bomb = false, this.event});
  bool get reversed => event == 'reversed';
}

int effectiveRank(Shape s, RuleCtx ctx) => s.jesters == s.count && ctx.event == 'jesterFreedom' ? 0 : s.rank;
bool better(int a, int b, RuleCtx ctx) => ctx.reversed ? a > b : a < b;

/// Null if the play is legal, otherwise the reason (same wording as the server).
String? judgePlay(List<int> cards, TrickInfo? trick, RuleCtx ctx) {
  final shape = playShape(cards);
  if (shape == null) return 'Nur gleiche Karten (plus Narren) zusammen spielen.';
  if (trick == null) return null;
  final rank = effectiveRank(shape, ctx);
  final bomb = ctx.bomb && shape.jesters == 0 && shape.count >= 4;
  if (bomb) return null;
  if (shape.count != trick.count) return 'Du musst genau ${trick.count} ${trick.count == 1 ? 'Karte' : 'Karten'} legen.';
  if (better(rank, trick.rank, ctx)) return null;
  if (ctx.snap && rank == trick.rank) return null;
  return ctx.reversed ? 'Verkehrte Welt: Du brauchst eine höhere Zahl.' : 'Du brauchst eine kleinere Zahl.';
}

/// Ranks that can take part in some legal play (others are dimmed in the hand).
Set<int> playableRanks(List<int> hand, TrickInfo? trick, RuleCtx ctx) {
  final counts = countBy(hand);
  final jesters = counts[jester] ?? 0;
  final out = <int>{};
  final sizes = trick != null ? [trick.count] : List.generate(hand.length, (i) => i + 1);
  counts.forEach((rank, n) {
    if (rank == jester) return;
    for (var j = 0; j <= jesters; j++) {
      for (final size in {...sizes, if (ctx.bomb) n + j}) {
        final naturals = size - j;
        if (naturals < 1 || naturals > n) continue;
        final cards = [...List.filled(naturals, rank), ...List.filled(j, jester)];
        if (judgePlay(cards, trick, ctx) == null) {
          out.add(rank);
          if (j > 0) out.add(jester);
        }
      }
    }
  });
  for (var j = 1; j <= jesters; j++) {
    if (trick == null || trick.count == j) {
      if (judgePlay(List.filled(j, jester), trick, ctx) == null) out.add(jester);
    }
  }
  return out;
}

String rankTitle(int index, int count) {
  if (index == 0) return 'Großer Jakob';
  if (index == count - 1) return 'Großer Knecht';
  if (count >= 4 && index == 1) return 'Kleiner Jakob';
  if (count >= 4 && index == count - 2) return 'Kleiner Knecht';
  return 'Bürger';
}

/// "eine Neun", "3× Neun", "einen Narren", "2× Sieben + Narr"
String describeCards(List<int> cards) {
  final naturals = cards.where((c) => c != jester).toList();
  final jesters = cards.length - naturals.length;
  if (naturals.isEmpty) return jesters == 1 ? 'einen Narren' : '$jesters Narren';
  final rank = naturals.first;
  final word = rankWord(rank);
  final base = naturals.length > 1
      ? '${naturals.length}× $word'
      : rank == 8 ? 'eine Acht' : rank == 11 ? 'eine Elf' : 'eine $word';
  if (jesters == 0) return base;
  return jesters == 1 ? '$base + Narr' : '$base + $jesters Narren';
}

class EventInfo {
  final String emoji, title, text;
  const EventInfo(this.emoji, this.title, this.text);
}

const eventText = {
  'holiday': EventInfo('🎉', 'Feiertag', 'Der König ist gnädig: Diese Runde gibt es keine Steuern.'),
  'taxHike': EventInfo('💰', 'Steuererhöhung', 'Die Knechte zahlen diese Runde je eine Karte mehr.'),
  'reversed': EventInfo('🙃', 'Verkehrte Welt', 'Diese Runde schlagen höhere Zahlen die niedrigeren.'),
  'doublePoints': EventInfo('✨', 'Doppelte Punkte', 'Jeder Platz bringt diese Runde doppelt so viele Punkte.'),
  'jesterFreedom': EventInfo('🃏', 'Narrenfreiheit', 'Ein Narr allein schlägt diese Runde jede Karte.'),
  'pest': EventInfo('🐀', 'Pest', 'Vor dem Ausspielen gibt jeder eine zufällige Karte an den Nächsten weiter.'),
  'audit': EventInfo('🔍', 'Steuerprüfung', 'Eine Karte des Großen Jakob wird allen gezeigt.'),
  'coronation': EventInfo('👑', 'Krönungsfest', 'Der Erste dieser Runde bekommt doppelte Punkte.'),
  'charity': EventInfo('🤲', 'Mildtätigkeit', 'Der Große Jakob schenkt dem Großen Knecht seine schlechteste Karte.'),
};

const missionText = {
  'twelveTrick': EventInfo('🌾', 'Bauernaufstand', 'Gewinne einen Stich mit Zwölfen.'),
  'bigPlay': EventInfo('🧱', 'Großer Wurf', 'Lege mindestens 4 Karten auf einmal.'),
  'loneJester': EventInfo('🃏', 'Narrenstück', 'Spiele einen Narren ganz allein.'),
  'crownTwice': EventInfo('👑', 'Doppelte Krone', 'Werde mindestens zweimal Großer Jakob.'),
  'neverServant': EventInfo('🧹', 'Niemals Knecht', 'Werde im ganzen Spiel nie Großer Knecht (ab 2 Runden).'),
  'fiveTricks': EventInfo('🖐️', 'Stichsammler', 'Gewinne 5 Stiche in einem Spiel.'),
  'revolutionary': EventInfo('✊', 'Aufrührer', 'Rufe eine Revolution aus.'),
  'climber': EventInfo('🪜', 'Emporkömmling', 'Steige in einer Runde um mindestens zwei Ränge auf.'),
};

/// One line of the table log; second person for the viewer's own moves.
String? describeLog(Map entry, String Function(String id) name, String me) {
  final kind = entry['kind'] as String?;
  final by = entry['by'] as String?;
  final to = entry['to'] as String?;
  String cards() => describeCards(((entry['cards'] as List?) ?? const []).map((e) => (e as num).toInt()).toList());
  if (kind == 'snap' && to == me) return '⚡ Schnapp! Du setzt aus';
  if (by == me && kind != 'snap') {
    switch (kind) {
      case 'play': return 'Du legst ${cards()}';
      case 'bomb': return '💣 Du zündest eine Bombe: ${cards()}!';
      case 'pass': return 'Du passt';
      case 'timeout': return '⏳ Du warst zu langsam';
      case 'clear': return 'Neuer Stich – du spielst aus';
      case 'out': return '🎉 Du hast keine Karten mehr';
      case 'revolution': return '✊ Du rufst die Revolution aus – keine Steuern!';
      case 'grandRevolution': return '🔥 Deine Große Revolution! Die Ordnung kehrt sich um.';
      case 'jesterOut': return '🤡 Du gingst mit einem Narren raus und landest ganz unten';
      case 'unbeatable': return '👑 Unschlagbar! Du gewinnst den Stich sofort';
      case 'kingFall': return '👑💥 Königssturz! Du fällst auf den letzten Platz';
      case 'mercy': return '🙏 Du bittest um Gnade – keine große Steuer';
      case 'resume': return '👋 Du bist zurück';
    }
  }
  final who = by != null ? name(by) : '';
  final other = to != null ? name(to) : '';
  switch (kind) {
    case 'play': return '$who legt ${cards()}';
    case 'bomb': return '💣 $who zündet eine Bombe: ${cards()}!';
    case 'pass': return '$who passt';
    case 'timeout': return '⏳ $who war zu langsam';
    case 'clear': return by != null ? 'Neuer Stich – $who spielt aus' : 'Neuer Stich';
    case 'out': return '🎉 $who hat keine Karten mehr';
    case 'snap': return '⚡ Schnapp! $other setzt aus';
    case 'revolution': return '✊ $who ruft die Revolution aus – keine Steuern!';
    case 'grandRevolution': return '🔥 Große Revolution von $who! Die Ordnung kehrt sich um.';
    case 'left': return '🚪 $who hat den Tisch verlassen';
    case 'jesterOut': return '🤡 $who ging mit einem Narren raus und landet ganz unten';
    case 'unbeatable': return '👑 Unschlagbar! $who gewinnt den Stich sofort';
    case 'kingFall': return '👑💥 Königssturz! $who fällt auf den letzten Platz';
    case 'mission':
      final m = missionText[entry['mission']];
      return '📜 $who erfüllt die Mission „${m?.title ?? ''}“ (+3)';
    case 'mercy': return '🙏 $who bittet um Gnade – keine große Steuer';
    case 'abdicate': return to != null ? '🪑 $who dankt ab und tauscht mit $other' : '🪑 $who dankt ab';
    case 'jesterCurse':
      final n = (entry['count'] as num?)?.toInt() ?? 1;
      return '🤡 Narrenfluch: $who verliert $n ${n == 1 ? 'Punkt' : 'Punkte'}';
    case 'courtSwap': return '🔄 Hoftausch: Die Bürger reichen eine Karte weiter';
    case 'pest': return '🐀 Pest: Jeder reicht eine Karte weiter';
    case 'audit': return '🔍 Steuerprüfung: $who hat ${cards()}';
    case 'charity': return '🤲 $who schenkt $other ${cards()}';
    case 'autopilot': return '🤖 Ein Bot spielt für $who';
    case 'fastForward': return '⏩ Nur noch Bots haben Karten – die Runde wurde zu Ende gespielt';
    case 'resume': return '👋 $who ist zurück';
    case 'throne': return '🏰 Thronfolge! $who war dreimal in Folge Großer Jakob';
  }
  return null;
}

class SettingInfo {
  final String label;
  final String? hint;
  const SettingInfo(this.label, [this.hint]);
}

/// Lobby options shown as switches, in display order.
const settingText = {
  'revolution': SettingInfo('Revolution', 'Wer beide Narren hat, kann die Steuern abschaffen – als Großer Knecht sogar die Rangfolge umdrehen.'),
  'tracker': SettingInfo('Kartengedächtnis', 'Zeigt, welche Karten in dieser Runde schon gespielt wurden.'),
  'chat': SettingInfo('Chat', 'Nachrichten an den ganzen Tisch.'),
  'jestersTaxable': SettingInfo('Narren sind steuerpflichtig', 'Knechte müssen auch ihre Narren als beste Karten abgeben.'),
  'snap': SettingInfo('Schnapp!', 'Du darfst die gleiche Zahl legen – der Nächste ist dann für diesen Stich raus.'),
  'bomb': SettingInfo('Bombe', 'Vier oder mehr gleiche Karten ohne Narren schlagen jeden Stich und gewinnen ihn sofort.'),
  'kingFall': SettingInfo('Königssturz', 'Wird der Große Jakob nicht Erster, stürzt er auf den letzten Platz.'),
  'jesterBan': SettingInfo('Narrenverbot', 'Wer mit einem Narren ausgeht, landet auf dem letzten Platz.'),
  'events': SettingInfo('Hofgeflüster', 'Jede Runde ein zufälliges Ereignis: Feiertag, Pest, Krönungsfest, Verkehrte Welt …'),
  'missions': SettingInfo('Geheime Missionen', 'Jeder bekommt eine verdeckte Aufgabe – erfüllt bringt sie 3 Bonuspunkte.'),
  'mercy': SettingInfo('Gnadenrecht', 'Einmal pro Spiel darf der Große Knecht die große Steuer verweigern.'),
  'abdicate': SettingInfo('Abdankung', 'Der Große Jakob darf abdanken und tauscht den Platz mit einem Bürger.'),
  'jesterCurse': SettingInfo('Narrenfluch', 'Wer am Rundenende noch Narren hat, verliert pro Narr einen Punkt.'),
  'courtSwap': SettingInfo('Hoftausch', 'Nach den Steuern reichen die Bürger blind eine Karte weiter.'),
  'blitz': SettingInfo('Blitzrunde', 'Die Zugzeit wird jede Runde 5 Sekunden kürzer (mindestens 10 s).'),
  'throne': SettingInfo('Thronfolge', 'Wer dreimal hintereinander Großer Jakob wird, gewinnt sofort.'),
  'teams': SettingInfo('Adel gegen Volk', 'Zwei Teams (abwechselnd nach Sitzplatz), die Punkte zählen fürs Team. Gerade Spielerzahl ab 4.'),
  'doubleDeck': SettingInfo('Doppeldeck', 'Zwei Kartensätze (160 Karten) – bis zu 12 Spieler am Tisch.'),
};

const roundOptions = [3, 5, 7, 10];
const goalOptions = [null, 20, 30, 50];
const turnOptions = [null, 15, 30, 45, 60];
const taxOptions = {'none': 'Keine', 'normal': 'Normal', 'high': 'Hoch'};
