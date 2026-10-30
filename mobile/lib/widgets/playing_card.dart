import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../api.dart';
import '../game/models.dart';
import '../game/rules.dart';
import '../i18n/i18n.dart';
import '../theme.dart';
import '../widgets/jakob_icons.dart';
import 'card_layout.dart';

Color hexColor(String hex, [Color fallback = C.surface]) {
  final h = hex.replaceFirst('#', '');
  if (h.length != 6) return fallback;
  final v = int.tryParse(h, radix: 16);
  return v == null ? fallback : Color(0xFF000000 | v);
}

TextStyle deckFont(String font, double size, Color color) {
  switch (font) {
    case 'klassisch':
      return GoogleFonts.cinzel(fontSize: size, color: color, fontWeight: FontWeight.w700, height: 1);
    case 'verspielt':
      return GoogleFonts.fredoka(fontSize: size, color: color, fontWeight: FontWeight.w600, height: 1);
    default:
      return GoogleFonts.grenzeGotisch(fontSize: size, color: color, fontWeight: FontWeight.w700, height: 1);
  }
}

String numeral(int rank) => rank == jester ? t('N') : '$rank';

/// A card face drawn from the deck design. Width drives every measure (aspect 5:7).
class PlayingCard extends StatelessWidget {
  final int rank;
  final Deck deck;
  final double width;
  final bool selected, dimmed, marked;

  const PlayingCard({super.key, required this.rank, required this.deck, this.width = 72, this.selected = false, this.dimmed = false, this.marked = false});

  @override
  Widget build(BuildContext context) {
    final face = deck.face(rank);
    final h = width * 1.4;
    final s = width / 100;
    final frame = hexColor(deck.frame);
    final accent = hexColor(deck.accent, C.gold);
    final paper = hexColor(deck.paper, C.ink);
    final ink = hexColor(deck.ink, C.onGold);
    final full = deck.photoFit == 'vollbild' && (face.image != null || face.art != null);

    Widget body;
    if (face.layout != null) {
      body = LayoutFace(deck: deck, face: face, rank: rank, layout: face.layout!, width: width, small: width < 56);
    } else if (full && face.image != null) {
      body = Stack(fit: StackFit.expand, children: [
        Image.network(Api.media(face.image!), fit: BoxFit.cover, errorBuilder: (_, _, _) => ColoredBox(color: frame)),
        const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x00000000), Color(0x00000000), Color(0xAA000000)]))),
        Positioned(left: 6 * s, top: 5 * s, child: _CornerBadge(text: numeral(rank), deck: deck, size: 22 * s)),
      ]);
    } else if (full && face.art != null) {
      body = SvgPicture.network(
        Api.artUrl(face.art!, rank: rank, bg: deck.frame),
        fit: BoxFit.cover,
        placeholderBuilder: (_) => ColoredBox(color: frame, child: Center(child: Text(numeral(rank), style: deckFont(deck.font, 40 * s, accent)))),
      );
    } else {
      body = ColoredBox(
        color: paper,
        child: Stack(children: [
          Positioned.fill(
            child: Container(
              margin: EdgeInsets.all(4 * s),
              decoration: BoxDecoration(border: Border.all(color: accent.withValues(alpha: .7), width: 1.4 * s), borderRadius: BorderRadius.circular(7 * s)),
            ),
          ),
          Positioned(left: 8 * s, top: 7 * s, child: Text(numeral(rank), style: deckFont(deck.font, 24 * s, ink))),
          Positioned(right: 8 * s, bottom: 24 * s, child: Transform.rotate(angle: math.pi, child: Text(numeral(rank), style: deckFont(deck.font, 24 * s, ink)))),
          Align(
            alignment: const Alignment(0, -.12),
            child: Container(
              width: 62 * s, height: 62 * s,
              decoration: BoxDecoration(shape: BoxShape.circle, color: frame, border: Border.all(color: accent, width: 2.4 * s)),
              clipBehavior: Clip.antiAlias,
              child: face.image != null
                  ? Image.network(Api.media(face.image!), fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox())
                  : face.art != null
                      ? Padding(padding: EdgeInsets.all(4 * s), child: SvgPicture.network(Api.artUrl(face.art!, full: false)))
                      : Center(child: Text(face.emoji, style: TextStyle(fontSize: 30 * s))),
            ),
          ),
        ]),
      );
    }

    final card = Container(
      width: width, height: h,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(9 * s),
        border: Border.all(color: selected ? C.goldSoft : Colors.black.withValues(alpha: .35), width: selected ? 2.2 : 1),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: .45), blurRadius: 10 * s, offset: Offset(0, 4 * s)),
          if (selected) BoxShadow(color: C.gold.withValues(alpha: .55), blurRadius: 18 * s, spreadRadius: 1),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(fit: StackFit.expand, children: [
        body,
        if (width >= 56 && face.layout == null) Positioned(left: 0, right: 0, bottom: 5 * s, child: _NameBanner(name: t(face.name), deck: deck, scale: s)),
        if (marked)
          Positioned(right: 4 * s, top: 4 * s, child: Container(
            padding: EdgeInsets.symmetric(horizontal: 5 * s, vertical: 2 * s),
            decoration: BoxDecoration(color: C.gold, borderRadius: BorderRadius.circular(8 * s)),
            child: Text(t('neu'), style: T.label(10 * s, color: C.onGold)),
          )),
      ]),
    );
    if (!dimmed) return card;
    // Unplayable cards sink into the shadow instead of turning milky.
    return Stack(children: [
      card,
      Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(color: const Color(0xA6120A1F), borderRadius: BorderRadius.circular(9 * s)))),
    ]);
  }
}

class _CornerBadge extends StatelessWidget {
  final String text;
  final Deck deck;
  final double size;
  const _CornerBadge({required this.text, required this.deck, required this.size});

  @override
  Widget build(BuildContext context) => Container(
        padding: EdgeInsets.symmetric(horizontal: size * .28, vertical: size * .12),
        decoration: BoxDecoration(color: hexColor(deck.frame).withValues(alpha: .85), borderRadius: BorderRadius.circular(size * .3), border: Border.all(color: hexColor(deck.accent, C.gold))),
        child: Text(text, style: deckFont(deck.font, size, hexColor(deck.accent, C.gold))),
      );
}

class _NameBanner extends StatelessWidget {
  final String name;
  final Deck deck;
  final double scale;
  const _NameBanner({required this.name, required this.deck, required this.scale});

  @override
  Widget build(BuildContext context) => Center(
        child: Container(
          constraints: BoxConstraints(maxWidth: 88 * scale),
          padding: EdgeInsets.symmetric(horizontal: 6 * scale, vertical: 2.5 * scale),
          decoration: BoxDecoration(
            color: hexColor(deck.frame),
            borderRadius: BorderRadius.circular(3 * scale),
            border: Border.all(color: hexColor(deck.accent, C.gold), width: 1.1 * scale),
          ),
          child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center,
              style: deckFont(deck.font, 10.5 * scale, hexColor(deck.paper, C.ink))),
        ),
      );
}

/// The back of a card: pattern in the deck colours with the emblem, or the back photo.
class CardBack extends StatelessWidget {
  final Deck? deck;
  final double width;
  /// Equipped loot card back (item id); replaces the deck's back.
  final String? loot;
  const CardBack({super.key, this.deck, this.width = 40, this.loot});

  @override
  Widget build(BuildContext context) {
    final back = deck?.back ?? const {};
    final a = hexColor(back['a'] as String? ?? '#6b1e2e');
    final b = hexColor(back['b'] as String? ?? '#f4b73a', C.gold);
    final s = width / 100;
    final image = back['image'] as String?;
    final art = back['art'] as String?;
    return Container(
      width: width, height: width * 1.4,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(9 * s),
        border: Border.all(color: Colors.white.withValues(alpha: .85), width: math.max(1.2, 3 * s)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .4), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      clipBehavior: Clip.antiAlias,
      child: loot != null
          ? SvgPicture.network(Api.lootUrl(loot!), fit: BoxFit.cover)
          : image != null
          // Crop chosen in the editor: offset in percent of the card, then zoom.
          ? ClipRect(
              child: Transform.translate(
                offset: Offset(lnum(back['panX']) / 200 * width, lnum(back['panY']) / 200 * width * 1.4),
                child: Transform.scale(
                  scale: lnum(back['zoom'], 1),
                  child: Image.network(Api.media(image), fit: BoxFit.cover, width: width, height: width * 1.4, errorBuilder: (_, _, _) => ColoredBox(color: a)),
                ),
              ),
            )
          : CustomPaint(
              painter: _PatternPainter(back['pattern'] as String? ?? 'rauten', a, b),
              child: Center(
                child: Container(
                  width: 52 * s, height: 52 * s,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: a, border: Border.all(color: b, width: math.max(1, 3 * s))),
                  child: art != null
                      ? Padding(padding: EdgeInsets.all(5 * s), child: SvgPicture.network(Api.artUrl(art, full: false)))
                      : Center(
                          child: back['emblem'] is String
                              ? Text(back['emblem'] as String, style: TextStyle(fontSize: 24 * s))
                              : JIcon('crown', size: 30 * s, color: b),
                        ),
                ),
              ),
            ),
    );
  }
}

class _PatternPainter extends CustomPainter {
  final String pattern;
  final Color a, b;
  _PatternPainter(this.pattern, this.a, this.b);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = a);
    final p = Paint()..color = b.withValues(alpha: .55)..strokeWidth = size.width * .035..style = PaintingStyle.stroke;
    final step = size.width / 6;
    switch (pattern) {
      case 'streifen':
        for (var x = -size.height; x < size.width; x += step) {
          canvas.drawLine(Offset(x, size.height), Offset(x + size.height, 0), p);
        }
      case 'punkte':
        final f = Paint()..color = b.withValues(alpha: .5);
        for (var y = step / 2; y < size.height; y += step) {
          for (var x = step / 2; x < size.width; x += step) {
            canvas.drawCircle(Offset(x, y), step * .16, f);
          }
        }
      case 'wellen':
        for (var y = 0.0; y < size.height + step; y += step) {
          final path = Path()..moveTo(0, y);
          for (var x = 0.0; x < size.width; x += step) {
            path.quadraticBezierTo(x + step / 2, y - step / 2, x + step, y);
          }
          canvas.drawPath(path, p);
        }
      case 'sterne':
        final f = Paint()..color = b.withValues(alpha: .5);
        for (var y = step / 2; y < size.height; y += step * 1.2) {
          for (var x = step / 2; x < size.width; x += step * 1.2) {
            canvas.drawPath(_star(Offset(x, y), step * .22), f);
          }
        }
      case 'schach':
        final f = Paint()..color = b.withValues(alpha: .28);
        for (var y = 0; y * step < size.height; y++) {
          for (var x = 0; x * step < size.width; x++) {
            if ((x + y).isEven) canvas.drawRect(Rect.fromLTWH(x * step, y * step, step, step), f);
          }
        }
      default:
        for (var x = -size.height; x < size.width + size.height; x += step) {
          canvas.drawLine(Offset(x, 0), Offset(x + size.height * .7, size.height), p);
          canvas.drawLine(Offset(x + size.height * .7, 0), Offset(x, size.height), p);
        }
    }
  }

  Path _star(Offset c, double r) {
    final path = Path();
    for (var i = 0; i < 10; i++) {
      final rad = i.isEven ? r : r * .45;
      final a = -math.pi / 2 + i * math.pi / 5;
      final pt = Offset(c.dx + rad * math.cos(a), c.dy + rad * math.sin(a));
      i == 0 ? path.moveTo(pt.dx, pt.dy) : path.lineTo(pt.dx, pt.dy);
    }
    return path..close();
  }

  @override
  bool shouldRepaint(covariant _PatternPainter old) => old.pattern != pattern || old.a != a || old.b != b;
}
