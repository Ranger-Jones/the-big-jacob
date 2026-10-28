import 'dart:math' as math;
import 'dart:ui';

/// Port of lib/jakob/rating.ts: levels from experience and Elo tiers.
int xpForLevel(int level) => 50 * level * (level - 1);
int levelFromXp(int xp) => math.max(1, ((1 + math.sqrt(1 + 4 * math.max(0, xp) / 50)) / 2).floor());

double levelFraction(int xp) {
  final level = levelFromXp(xp);
  final base = xpForLevel(level), next = xpForLevel(level + 1);
  return next > base ? (xp - base) / (next - base) : 0;
}

String levelTitle(int level) {
  const titles = ['Stallbursche', 'Knappe', 'Hofschreiber', 'Ritter', 'Burgvogt', 'Baron', 'Graf', 'Herzog', 'Kurfürst', 'Großer Jakob'];
  return titles[math.min(titles.length - 1, (level - 1) ~/ 5)];
}

class Tier {
  final String name, icon;
  final int min;
  final Color color;
  const Tier(this.name, this.icon, this.min, this.color);
}

const tiers = [
  Tier('Knecht', 'broom', 0, Color(0xFF8A7A6A)),
  Tier('Bürger', 'basket', 900, Color(0xFFA8662A)),
  Tier('Ritter', 'shield', 1100, Color(0xFF9AA3AD)),
  Tier('Baron', 'coronet', 1250, Color(0xFF3A6FD8)),
  Tier('Graf', 'medal', 1400, Color(0xFF8B4FC7)),
  Tier('Herzog', 'throne', 1550, Color(0xFFE09B1A)),
  Tier('Großer Jakob', 'crown', 1700, Color(0xFFF4B73A)),
];

Tier tierFor(int rating) => tiers.lastWhere((t) => rating >= t.min, orElse: () => tiers.first);
