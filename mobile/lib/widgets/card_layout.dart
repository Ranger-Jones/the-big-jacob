import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../api.dart';
import '../game/models.dart';
import '../game/rules.dart';
import '../i18n/i18n.dart';
import 'playing_card.dart';

/// Free card layouts from the card editor (port of the web's card-layout.tsx). Positions are percent of
/// the card (x of the width, y of the height), sizes percent of the width, so one layout looks the same
/// in the hand, on the table and in the large editor canvas.

/// Lets the editor wrap every element (`picture`, `number`, `name`, `sticker:<id>`) with its gesture handling.
typedef ElementWrap = Widget Function(String key, Widget child);

double lnum(Object? v, [double fallback = 0]) => v is num ? v.toDouble() : fallback;
Map<String, dynamic> lmap(Object? v) => v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};

/// The layout that reproduces the deck's standard look – the editor's starting point.
Map<String, dynamic> defaultLayout(Deck deck, CardFace face) {
  final drawn = face.image == null && face.art != null;
  final fullPicture = deck.photoFit == 'vollbild' && (face.image != null || face.art != null);
  return {
    'background': null,
    'frame': true,
    'picture': <String, dynamic>{
      'visible': true, 'fill': fullPicture, 'shape': drawn ? 'frei' : 'kreis',
      'x': 50, 'y': 43, 'size': drawn ? 78 : 62, 'rotate': 0, 'zoom': 1, 'panX': 0, 'panY': 0,
    },
    'number': fullPicture && drawn
        ? <String, dynamic>{'style': 'gross', 'x': 50, 'y': 22, 'size': 40, 'color': null}
        : <String, dynamic>{'style': 'ecken', 'x': 13, 'y': 9, 'size': 19, 'color': null},
    'name': <String, dynamic>{'style': 'band', 'x': 50, 'y': fullPicture ? 88 : 83, 'size': 8.5, 'width': 92},
    'stickers': <dynamic>[],
  };
}

/// Everything inside the card border for a card with a free layout.
class LayoutFace extends StatelessWidget {
  final Deck deck;
  final CardFace face;
  final int rank;
  final Map<String, dynamic> layout;
  final double width;
  /// Hand-size cards leave out the fine double frame and corner diamonds.
  final bool small;
  final ElementWrap? wrap;

  const LayoutFace({super.key, required this.deck, required this.face, required this.rank, required this.layout, required this.width, this.small = false, this.wrap});

  @override
  Widget build(BuildContext context) {
    final w = width, h = width * 1.4, s = width / 100;
    final frame = hexColor(deck.frame);
    final accent = hexColor(deck.accent);
    final paper = hexColor(deck.paper);
    final ink = hexColor(deck.ink);
    final picture = lmap(layout['picture']);
    final onArt = picture['fill'] == true && picture['visible'] != false;
    final background = layout['background'] is String ? hexColor(layout['background'] as String) : paper;

    Widget el(String key, Widget child) => wrap == null ? child : wrap!(key, child);
    Widget at(double x, double y, Widget child, {double rotate = 0}) => Positioned(
          left: x / 100 * w,
          top: y / 100 * h,
          child: FractionalTranslation(
            translation: const Offset(-.5, -.5),
            child: rotate == 0 ? child : Transform.rotate(angle: rotate * math.pi / 180, child: child),
          ),
        );

    final children = <Widget>[
      Positioned.fill(child: ColoredBox(color: background)),
      if (!onArt)
        const Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(center: Alignment(-.4, -.7), radius: .9, colors: [Color(0x80FFFFFF), Color(0x00FFFFFF)]),
              ),
            ),
          ),
        ),
    ];

    // Picture ------------------------------------------------------------------------------------
    if (picture['visible'] != false) {
      final zoom = lnum(picture['zoom'], 1), panX = lnum(picture['panX']), panY = lnum(picture['panY']);
      final drawn = face.image == null && face.art != null;
      Widget crop(Widget child, double bw, double bh, {bool scale = true}) => Transform.translate(
            offset: Offset(panX / 200 * bw, panY / 200 * bh),
            child: scale ? Transform.scale(scale: zoom, child: child) : child,
          );
      if (picture['fill'] == true) {
        final Widget content = face.image != null
            ? crop(Image.network(Api.media(face.image!), fit: BoxFit.cover, width: w, height: h, errorBuilder: (_, _, _) => const SizedBox()), w, h)
            : drawn
                ? crop(SvgPicture.network(Api.artUrl(face.art!, rank: rank, bg: deck.frame, numeral: false), fit: BoxFit.cover, width: w, height: h), w, h)
                : crop(Center(child: Text(face.emoji, style: TextStyle(fontSize: 60 * zoom * s, height: 1))), w, h, scale: false);
        children.add(Positioned.fill(child: el('picture', ClipRect(child: SizedBox(width: w, height: h, child: content)))));
      } else {
        final size = lnum(picture['size'], 62);
        final box = size / 100 * w;
        final shape = picture['shape'] as String? ?? 'kreis';
        final framed = shape != 'frei';
        final radius = BorderRadius.circular(shape == 'kreis' ? box / 2 : shape == 'abgerundet' ? box * .14 : 0);
        final Widget content = face.image != null
            ? crop(Image.network(Api.media(face.image!), fit: BoxFit.cover, width: box, height: box, errorBuilder: (_, _, _) => const SizedBox()), box, box)
            : drawn
                ? SvgPicture.network(Api.artUrl(face.art!, full: false), width: box, height: box)
                : Center(child: Text(face.emoji, style: TextStyle(fontSize: size * .58 * s, height: 1)));
        children.add(at(
          lnum(picture['x'], 50), lnum(picture['y'], 43),
          el('picture', Container(
            width: box,
            height: box,
            decoration: framed
                ? BoxDecoration(color: frame.withAlpha(0x18), borderRadius: radius, border: Border.all(color: frame.withAlpha(0x66), width: math.max(.5, .6 * s)))
                : null,
            child: framed ? ClipRRect(borderRadius: radius, child: content) : content,
          )),
          rotate: lnum(picture['rotate']),
        ));
      }
    }

    // Decorative frame -------------------------------------------------------------------------------
    if (layout['frame'] != false) {
      Widget inset(double f, Color color, double stroke) => Positioned(
            left: f * w, right: f * w, top: f * h, bottom: f * h,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(border: Border.all(color: color, width: stroke), borderRadius: BorderRadius.circular(.08 * w)),
              ),
            ),
          );
      children.add(inset(.045, onArt ? paper.withAlpha(0xcc) : accent, 1.5));
      if (!small) {
        children.add(inset(.075, onArt ? paper.withAlpha(0x66) : accent.withAlpha(0x55), 1));
        for (final (left, top) in [(true, true), (false, true), (true, false), (false, false)]) {
          children.add(Positioned(
            left: left ? .032 * w : null, right: left ? null : .032 * w,
            top: top ? .026 * h : null, bottom: top ? null : .026 * h,
            width: .05 * w, height: .05 * h,
            child: IgnorePointer(child: Transform.rotate(angle: math.pi / 4, child: ColoredBox(color: onArt ? paper : accent))),
          ));
        }
      }
    }

    // Stickers ---------------------------------------------------------------------------------------
    for (final raw in (layout['stickers'] as List? ?? const [])) {
      final st = lmap(raw);
      final size = lnum(st['size'], 16);
      final style = deckFont(deck.font, size * s, hexColor(st['color'] as String? ?? '#000000'));
      final text = st['value'] as String? ?? '';
      final Widget label = st['kind'] == 'text'
          ? _Outlined(text: text, style: style, stroke: math.max(.12, size / 50) * s, strokeColor: ink)
          : Text(text, style: style, maxLines: 1, softWrap: false);
      children.add(at(lnum(st['x'], 50), lnum(st['y'], 50), el('sticker:${st['id']}', label), rotate: lnum(st['rotate'])));
    }

    // Name -------------------------------------------------------------------------------------------
    final name = lmap(layout['name']);
    final nameStyle = name['style'] as String? ?? 'band';
    if (nameStyle != 'aus') {
      final band = nameStyle == 'band';
      final size = lnum(name['size'], 8.5);
      final text = Text(
        t(face.name),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: TextAlign.center,
        style: deckFont(deck.font, size * s, band ? paper : ink).copyWith(
          height: 1.25,
          shadows: band ? null : [Shadow(color: paper, blurRadius: s), Shadow(color: paper, blurRadius: s)],
        ),
      );
      Widget box = Container(
        width: lnum(name['width'], 92) / 100 * w,
        padding: band ? EdgeInsets.symmetric(horizontal: .07 * w, vertical: .8 * s) : EdgeInsets.zero,
        color: band ? frame : null,
        child: text,
      );
      // The notched ribbon ends; the editor shows the plain band so the selection outline fits.
      if (band && wrap == null) box = ClipPath(clipper: _RibbonClipper(), child: box);
      children.add(at(lnum(name['x'], 50), lnum(name['y'], 83), el('name', box)));
    }

    // Number -----------------------------------------------------------------------------------------
    final number = lmap(layout['number']);
    final numberStyle = number['style'] as String? ?? 'ecken';
    if (numberStyle != 'aus') {
      final size = lnum(number['size'], 19);
      final color = number['color'] is String ? hexColor(number['color'] as String) : accent;
      final x = lnum(number['x'], 13), y = lnum(number['y'], 9);
      if (numberStyle == 'gross') {
        final label = rank == jester ? t('Narr') : '$rank';
        final px = (rank == jester ? size * .55 : size) * s;
        children.add(at(x, y, el('number', _Outlined(
          text: label,
          style: deckFont(deck.font, px, color).copyWith(shadows: [Shadow(color: paper, offset: Offset(0, .4 * s))]),
          stroke: math.max(.15, size / 60) * s,
          strokeColor: ink,
        ))));
      } else {
        final style = deckFont(deck.font, size * s, color);
        children.add(at(x, y, el('number', Text(numeral(rank), style: style))));
        children.add(at(100 - x, 100 - y, IgnorePointer(child: Text(numeral(rank), style: style)), rotate: 180));
      }
    }

    return SizedBox(width: w, height: h, child: Stack(clipBehavior: Clip.hardEdge, children: children));
  }
}

/// Text with an outline behind the fill (like CSS text-stroke with paint-order stroke fill).
class _Outlined extends StatelessWidget {
  final String text;
  final TextStyle style;
  final double stroke;
  final Color strokeColor;
  const _Outlined({required this.text, required this.style, required this.stroke, required this.strokeColor});

  @override
  Widget build(BuildContext context) => Stack(children: [
        Text(text, maxLines: 1, softWrap: false, style: TextStyle(
          fontFamily: style.fontFamily,
          fontFamilyFallback: style.fontFamilyFallback,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          height: style.height,
          shadows: style.shadows,
          foreground: Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = stroke * 2
            ..strokeJoin = StrokeJoin.round
            ..color = strokeColor,
        )),
        Text(text, maxLines: 1, softWrap: false, style: style.copyWith(shadows: const [])),
      ]);
}

class _RibbonClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) => Path()
    ..moveTo(0, 0)
    ..lineTo(size.width, 0)
    ..lineTo(size.width * .94, size.height / 2)
    ..lineTo(size.width, size.height)
    ..lineTo(0, size.height)
    ..lineTo(size.width * .06, size.height / 2)
    ..close();

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}
