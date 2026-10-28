import 'dart:ui';

import '../api.dart';

/// A cosmetic from a loot chest (catalogue in src/lib/loot/catalog.ts).
class LootItem {
  final String id, kind, rarity, name, text;
  const LootItem(this.id, this.kind, this.rarity, this.name, this.text);

  factory LootItem.from(Map m) => LootItem(
        m['id'] as String, m['kind'] as String, m['rarity'] as String, m['name'] as String? ?? '', m['text'] as String? ?? '',
      );
}

const lootKinds = ['rahmen', 'wappen', 'rueckseite', 'filz'];
const lootKindLabel = {'rahmen': 'Rahmen', 'wappen': 'Wappen', 'rueckseite': 'Kartenrücken', 'filz': 'Tischfilz'};
const lootKindIcon = {'rahmen': 'user', 'wappen': 'shield', 'rueckseite': 'cards', 'filz': 'image'};
const rarityOrder = ['normal', 'selten', 'episch', 'legendaer'];
const rarityLabel = {'normal': 'Gewöhnlich', 'selten': 'Selten', 'episch': 'Episch', 'legendaer': 'Legendär'};
const rarityColor = {
  'normal': Color(0xFFB8A7C8), 'selten': Color(0xFF5B8DEF), 'episch': Color(0xFFB46EF0), 'legendaer': Color(0xFFF4B73A),
};

/// Aspect ratio (width / height) of each kind's artwork.
const lootAspect = {'rahmen': 1.0, 'wappen': 1.0, 'rueckseite': 100 / 140, 'filz': 160 / 100};

String lootUrl(String id) => Api.lootUrl(id);
