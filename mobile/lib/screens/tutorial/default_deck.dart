import '../../game/models.dart';

/// Picks the deck the lessons are drawn with from the `decks` API answer
/// (`{presets, mine, defaultId}`): the one marked as default, otherwise the first preset.
Deck? defaultDeckFrom(Object? data) {
  if (data is! Map) return null;
  List<Deck> parse(Object? list) => ((list as List?) ?? const []).whereType<Map>().map(Deck.from).toList();
  final presets = parse(data['presets']);
  final mine = parse(data['mine']);
  final id = data['defaultId'] as String?;
  for (final d in [...presets, ...mine]) {
    if (d.id == id) return d;
  }
  return presets.isNotEmpty ? presets.first : null;
}
