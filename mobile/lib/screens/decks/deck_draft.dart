import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../game/models.dart';
import '../../widgets/card_layout.dart';

/// Labels as on the web (lib/decks.ts).
const fontLabels = {'gotisch': 'Gotisch', 'klassisch': 'Klassisch', 'verspielt': 'Verspielt'};
const patternLabels = {
  'rauten': 'Rauten', 'streifen': 'Streifen', 'punkte': 'Tupfen', 'wellen': 'Wellen', 'sterne': 'Sterne', 'schach': 'Schach',
};
const photoFitLabels = {'medaillon': 'Im Medaillon', 'vollbild': 'Ganze Karte'};
const pictureShapeLabels = {'kreis': 'Kreis', 'abgerundet': 'Abgerundet', 'frei': 'Frei'};
const numberStyleLabels = {'ecken': 'In den Ecken', 'gross': 'Groß', 'aus': 'Aus'};
const nameStyleLabels = {'band': 'Band', 'schlicht': 'Schlicht', 'aus': 'Aus'};

const maxStickers = 12;

/// Deep copy of JSON-like data.
T jsonCopy<T>(T value) => jsonDecode(jsonEncode(value)) as T;

/// A plain parchment deck with Roman numerals: the "blank" start for a new deck.
Map<String, dynamic> blankDesign() {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  // Through JSON so every nested map is a plain Map<String, dynamic> that accepts any value.
  return jsonCopy<Map<String, dynamic>>({
    'v': 1, 'frame': '#4a3b2a', 'accent': '#9a7b3c', 'paper': '#f7f1e3', 'ink': '#2b2118', 'font': 'klassisch', 'photoFit': 'medaillon',
    'back': {'pattern': 'rauten', 'a': '#4a3b2a', 'b': '#6a5640', 'emblem': '✦', 'art': null, 'image': null},
    'cards': [
      for (var i = 0; i < 12; i++) {'name': 'Karte ${i + 1}', 'emoji': roman[i], 'art': null, 'image': null},
      {'name': 'Narr', 'emoji': '🃏', 'art': null, 'image': null},
    ],
  });
}

/// UTF-16 length, as the server's validation counts it.
bool _fits(Object? v, int max) => v is String && v.trim().isNotEmpty && v.trim().length <= max;

/// The deck being edited: name, design JSON and an undo history of whole-design snapshots.
/// Slider drags and typing are coalesced into one undo step, like in the web editor.
class DeckDraft extends ChangeNotifier {
  final String id;
  String _name;
  Map<String, dynamic> _design;
  final _past = <Map<String, dynamic>>[];
  final _future = <Map<String, dynamic>>[];
  ({String key, DateTime at})? _run;
  bool dirty = false;

  DeckDraft(Deck deck)
      : id = deck.id,
        _name = deck.name,
        _design = jsonCopy(Map<String, dynamic>.from(deck.design));

  String get name => _name;
  Map<String, dynamic> get design => _design;
  Deck get deck => Deck.fromDesign(id, _name, _design);
  bool get canUndo => _past.isNotEmpty;
  bool get canRedo => _future.isNotEmpty;

  Map<String, dynamic> get back => lmap(_design['back']);
  Map<String, dynamic> card(int rank) => lmap((_design['cards'] as List)[rank - 1]);

  set name(String value) {
    _name = value;
    dirty = true;
    notifyListeners();
  }

  /// Applies [fn] to a copy of the design. With a [key], quick repeated edits form one undo step.
  void change(void Function(Map<String, dynamic> d) fn, {String? key, bool history = true}) {
    final now = DateTime.now();
    final run = _run;
    final sameRun = key != null && run != null && run.key == key && now.difference(run.at).inMilliseconds < 900;
    if (history && !sameRun) {
      _past.add(jsonCopy(_design));
      if (_past.length > 80) _past.removeAt(0);
      _future.clear();
    }
    _run = key == null ? null : (key: key, at: now);
    final next = jsonCopy(_design);
    fn(next);
    _design = next;
    dirty = true;
    notifyListeners();
  }

  /// Starts an undo step for a gesture whose updates follow with `history: false`.
  void checkpoint() {
    _past.add(jsonCopy(_design));
    _future.clear();
    _run = null;
  }

  void set(String field, Object? value, {String? key}) => change((d) => d[field] = value, key: key);
  void setBack(String field, Object? value, {String? key}) => change((d) => (d['back'] as Map)[field] = value, key: key);
  void setCard(int rank, String field, Object? value, {String? key}) =>
      change((d) => ((d['cards'] as List)[rank - 1] as Map)[field] = value, key: key);
  /// Several card fields in one undo step (e.g. a drawing replaces the photo).
  void setCardFields(int rank, Map<String, dynamic> fields) =>
      change((d) => ((d['cards'] as List)[rank - 1] as Map<String, dynamic>).addAll(fields));
  void setBackFields(Map<String, dynamic> fields) => change((d) => (d['back'] as Map<String, dynamic>).addAll(fields));

  /// The card's free layout, or the standard one it would start from.
  Map<String, dynamic> layoutOf(int rank) {
    final c = card(rank);
    final d = deck;
    return c['layout'] is Map ? lmap(c['layout']) : defaultLayout(d, d.face(rank));
  }

  void editLayout(int rank, void Function(Map<String, dynamic> l) fn, {String? key, bool history = true}) {
    final start = deck;
    change((d) {
      final c = (d['cards'] as List)[rank - 1] as Map;
      final l = c['layout'] is Map ? Map<String, dynamic>.from(c['layout'] as Map) : defaultLayout(start, start.face(rank));
      for (final k in ['picture', 'number', 'name']) {
        l[k] = Map<String, dynamic>.from(l[k] as Map);
      }
      l['stickers'] = <dynamic>[for (final s in (l['stickers'] as List? ?? const [])) Map<String, dynamic>.from(s as Map)];
      fn(l);
      c['layout'] = l;
    }, key: key == null ? null : '$rank-$key', history: history);
  }

  void undo() {
    if (_past.isEmpty) return;
    _future.insert(0, _design);
    _design = _past.removeLast();
    _run = null;
    dirty = true;
    notifyListeners();
  }

  void redo() {
    if (_future.isEmpty) return;
    _past.add(_design);
    _design = _future.removeAt(0);
    _run = null;
    dirty = true;
    notifyListeners();
  }

  void markSaved() {
    dirty = false;
    notifyListeners();
  }

  /// The checks the server makes on names and symbols, with a German hint for the first problem.
  String? problem() {
    if (!_fits(_name, 40)) return 'Der Deck-Name braucht 1–40 Zeichen.';
    if (!_fits(back['emblem'], 8)) return 'Das Wappen braucht ein Symbol (höchstens 8 Zeichen).';
    for (var r = 1; r <= 13; r++) {
      final c = card(r);
      if (!_fits(c['name'], 24)) return 'Karte $r braucht einen Namen (höchstens 24 Zeichen).';
      if (!_fits(c['emoji'], 8)) return 'Karte $r braucht ein Symbol (höchstens 8 Zeichen).';
      final layout = c['layout'];
      if (layout is Map) {
        for (final s in (layout['stickers'] as List? ?? const [])) {
          if (!_fits((s as Map)['value'], 24)) return 'Ein Sticker auf Karte $r ist leer.';
        }
      }
    }
    return null;
  }

  /// The design as sent to the server: names and symbols trimmed.
  Map<String, dynamic> payload() {
    final d = jsonCopy(_design);
    final b = d['back'] as Map;
    b['emblem'] = (b['emblem'] as String? ?? '').trim();
    for (final c in d['cards'] as List) {
      final m = c as Map;
      m['name'] = (m['name'] as String? ?? '').trim();
      m['emoji'] = (m['emoji'] as String? ?? '').trim();
    }
    return d;
  }
}

int _stickerSeq = 0;

/// A short id for a new sticker (server: 1–12 of a–z, 0–9).
String newStickerId() {
  final id = '${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}${(_stickerSeq++).toRadixString(36)}';
  return id.substring(id.length > 12 ? id.length - 12 : 0);
}
