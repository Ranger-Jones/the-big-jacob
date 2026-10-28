import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme.dart';
import 'jakob_icons.g.dart';

/// App-only icons in the same "Hofstaat" style as the generated set: 24-unit grid, round 1.75 strokes,
/// a soft 20 % duotone fill for the main shape.
const _extraIcons = <String, String>{
  'qr': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'
      '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" fill="currentColor" fill-opacity="0.2"></rect>'
      '<rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" fill="currentColor" fill-opacity="0.2"></rect>'
      '<rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" fill="currentColor" fill-opacity="0.2"></rect>'
      '<path d="M14 14h2.5v2.5M20.5 14v.01M14 20.5h.01M17.5 20.5h3v-3"></path>'
      '<rect x="5.9" y="5.9" width="1.7" height="1.7" fill="currentColor" stroke="none"></rect>'
      '<rect x="16.4" y="5.9" width="1.7" height="1.7" fill="currentColor" stroke="none"></rect>'
      '<rect x="5.9" y="16.4" width="1.7" height="1.7" fill="currentColor" stroke="none"></rect></svg>',
  'scan': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'
      '<path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16"></path>'
      '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" fill-opacity="0.2"></rect>'
      '<path d="M4.5 12h15"></path></svg>',
  'globe': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'
      '<circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.2"></circle>'
      '<path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5Z"></path></svg>',
  'pin': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'
      '<path d="M12 21s-6.5-5.4-6.5-11a6.5 6.5 0 0 1 13 0c0 5.6-6.5 11-6.5 11Z" fill="currentColor" fill-opacity="0.2"></path>'
      '<circle cx="12" cy="10" r="2.4"></circle></svg>',
  'scroll-quill': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'
      '<path d="M6 4.5h10.5a2 2 0 0 1 2 2V18a2.5 2.5 0 0 1-2.5 2.5H7.5A2.5 2.5 0 0 1 5 18V6.5" fill="currentColor" fill-opacity="0.2"></path>'
      '<path d="M5 6.5a2 2 0 1 1 4 0v11M9 9h6M9 12.5h6M9 16h3.5"></path></svg>',
};

bool hasJakobIcon(String name) => jakobIconSvgs.containsKey(name) || _extraIcons.containsKey(name);

/// One "Hofstaat" icon, tinted with [color] (or the surrounding IconTheme colour).
class JIcon extends StatelessWidget {
  final String name;
  final double size;
  final Color? color;
  const JIcon(this.name, {super.key, this.size = 22, this.color});

  @override
  Widget build(BuildContext context) {
    final svg = jakobIconSvgs[name] ?? _extraIcons[name] ?? jakobIconSvgs['star']!;
    return SvgPicture.string(
      svg,
      width: size,
      height: size,
      theme: SvgTheme(currentColor: color ?? IconTheme.of(context).color ?? C.ink),
    );
  }
}

// Semantic mappings, the same as src/components/ui/icons.tsx --------------------------------------

/// Icon for a seat in the rank order (Großer Jakob … Großer Knecht).
String rankIcon(int index, int count) {
  if (index == 0) return 'crown';
  if (index == count - 1) return 'broom';
  if (count >= 4 && index == 1) return 'coronet';
  if (count >= 4 && index == count - 2) return 'bucket';
  return 'basket';
}

const eventIcons = {
  'holiday': 'party', 'taxHike': 'coins', 'reversed': 'flip', 'doublePoints': 'sparkles', 'jesterFreedom': 'jester',
  'pest': 'rat', 'audit': 'search', 'coronation': 'crown', 'charity': 'gift',
};

const missionIcons = {
  'twelveTrick': 'wheat', 'bigPlay': 'bricks', 'loneJester': 'jester', 'crownTwice': 'crown', 'neverServant': 'broom',
  'fiveTricks': 'cards', 'revolutionary': 'fist', 'climber': 'ladder',
};

const badgeIcons = {
  'first-game': 'cards', 'first-win': 'trophy', 'ten-wins': 'castle', 'crowns': 'crown', 'servant': 'broom',
  'revolution': 'fist', 'grand': 'flame', 'bomb': 'bomb', 'rise': 'ladder', 'cards': 'jester',
};

/// Campaign stations by level.
const stageIcons = {1: 'wheat', 2: 'mug', 3: 'basket', 4: 'hammer', 5: 'shield', 6: 'church', 7: 'coronet', 8: 'crown'};

/// Icons in front of table log lines (the texts then come without their leading emoji).
const logIcons = {
  'bomb': 'bomb', 'timeout': 'hourglass', 'out': 'sparkles', 'snap': 'bolt', 'revolution': 'fist', 'grandRevolution': 'flame',
  'left': 'exit', 'jesterOut': 'jester', 'unbeatable': 'crown', 'kingFall': 'crown', 'mission': 'target', 'courtSwap': 'swap',
  'pest': 'rat', 'autopilot': 'bot', 'mercy': 'dove', 'abdicate': 'throne', 'audit': 'search', 'charity': 'gift',
  'jesterCurse': 'jester', 'throne': 'castle', 'resume': 'user', 'fastForward': 'skip',
};

const teamIcons = {0: 'crown', 1: 'wheat'};

/// Removes leading emoji (and the space after them) from a text that now gets an icon instead.
String stripEmoji(String text) =>
    text.replaceFirst(RegExp(r'^(?:[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]\s*)+', unicode: true), '');

const _medalColors = [Color(0xFFF4B73A), Color(0xFFC9CDD8), Color(0xFFC98A52)];

/// Gold, silver or bronze medal for places 1–3; the plain number otherwise.
class Medal extends StatelessWidget {
  final int place;
  final double size;
  const Medal(this.place, {super.key, this.size = 24});

  @override
  Widget build(BuildContext context) {
    if (place < 1 || place > 3) return Text('$place.', style: T.display(size * .8, color: C.inkSoft));
    return JIcon('medal', size: size, color: _medalColors[place - 1]);
  }
}

/// Art id of a bot's portrait (served by /api/app/art like card art), see src/components/deck/bot-portraits.tsx.
const _botArt = {
  'Hofnarr Hugo': 'bot-hugo', 'Gräfin Gisela': 'bot-gisela', 'Bauer Bernd': 'bot-bernd', 'Ritter Rüdiger': 'bot-ruediger',
  'Köchin Klara': 'bot-klara', 'Mönch Matthias': 'bot-matthias', 'Baronin Berta': 'bot-berta', 'Schäferin Sina': 'bot-sina',
  'Steinmetz Stefan': 'bot-stefan', 'Näherin Nora': 'bot-nora', 'Erzbischof Egon': 'bot-egon', 'Marschall Max': 'bot-max',
};

String botArtId(String name) => _botArt[name] ?? 'bot-hoefling';
