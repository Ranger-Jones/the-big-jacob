import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme.dart';

/// The one series colour for every chart on the dark velvet panels.
const chartGold = Color(0xFFC0842A);

TextPainter _text(String s, TextStyle style) => TextPainter(text: TextSpan(text: s, style: style), textDirection: TextDirection.ltr)..layout();

/// Column chart with one bar per category. Only the highest bar carries its value.
class BarChart extends StatelessWidget {
  final List<int> values;
  final List<String> labels;
  final double height;
  const BarChart({super.key, required this.values, required this.labels, this.height = 150});

  @override
  Widget build(BuildContext context) => Semantics(
        label: [for (var i = 0; i < values.length; i++) '${labels[i]}: ${values[i]}'].join(', '),
        child: ExcludeSemantics(
          child: SizedBox(
            height: height,
            width: double.infinity,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 700),
              curve: Curves.easeOutCubic,
              builder: (_, t, _) => CustomPaint(painter: _BarPainter(values, labels, t)),
            ),
          ),
        ),
      );
}

class _BarPainter extends CustomPainter {
  final List<int> values;
  final List<String> labels;
  final double t;
  _BarPainter(this.values, this.labels, this.t);

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    const labelH = 22.0, valueH = 22.0;
    final chartH = size.height - labelH - valueH;
    final base = size.height - labelH;
    final maxV = values.reduce(math.max);
    final maxI = values.indexOf(maxV);
    final slot = size.width / values.length;
    final barW = math.min(44.0, slot * .62);

    canvas.drawLine(Offset(0, base), Offset(size.width, base), Paint()..color = C.line..strokeWidth = 1);

    for (var i = 0; i < values.length; i++) {
      final cx = slot * i + slot / 2;
      final h = maxV == 0 ? 0.0 : chartH * values[i] / maxV * t;
      final top = base - math.max(h, values[i] > 0 ? 3.0 : 0.0);
      final rect = RRect.fromRectAndCorners(
        Rect.fromLTRB(cx - barW / 2, top, cx + barW / 2, base),
        topLeft: const Radius.circular(7), topRight: const Radius.circular(7),
      );
      final isMax = i == maxI && maxV > 0;
      canvas.drawRRect(rect, Paint()..color = isMax ? chartGold : chartGold.withValues(alpha: .55));

      final label = _text(labels[i], T.label(13, color: isMax ? C.ink : C.inkMute));
      label.paint(canvas, Offset(cx - label.width / 2, base + 5));

      if (isMax) {
        final v = _text('${values[i]}', T.label(15, color: C.goldSoft));
        v.paint(canvas, Offset(cx - v.width / 2, top - v.height - 3));
      }
    }
  }

  @override
  bool shouldRepaint(_BarPainter old) => old.t != t || old.values != values || old.labels != labels;
}

/// A line of points over time (oldest left). Only the highest point is labelled.
class LineChart extends StatelessWidget {
  final List<int> values;
  final double height;
  const LineChart({super.key, required this.values, this.height = 140});

  @override
  Widget build(BuildContext context) => Semantics(
        label: values.join(', '),
        child: ExcludeSemantics(
          child: SizedBox(
            height: height,
            width: double.infinity,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 900),
              curve: Curves.easeOutCubic,
              builder: (_, t, _) => CustomPaint(painter: _LinePainter(values, t)),
            ),
          ),
        ),
      );
}

class _LinePainter extends CustomPainter {
  final List<int> values;
  final double t;
  _LinePainter(this.values, this.t);

  @override
  void paint(Canvas canvas, Size size) {
    if (values.length < 2) return;
    const top = 26.0, bottom = 6.0, side = 8.0;
    final maxV = values.reduce(math.max);
    final minV = math.min(0, values.reduce(math.min));
    final range = math.max(1, maxV - minV);
    final w = size.width - side * 2, h = size.height - top - bottom;
    Offset at(int i) => Offset(side + w * i / (values.length - 1), top + h * (1 - (values[i] - minV) / range));

    // Faint guide at zero points.
    final zeroY = top + h * (1 - (0 - minV) / range);
    canvas.drawLine(Offset(0, zeroY), Offset(size.width, zeroY), Paint()..color = C.line..strokeWidth = 1);

    // Reveal left to right.
    canvas.save();
    canvas.clipRect(Rect.fromLTWH(0, 0, size.width * t + 6, size.height));

    final line = Path()..moveTo(at(0).dx, at(0).dy);
    for (var i = 1; i < values.length; i++) {
      line.lineTo(at(i).dx, at(i).dy);
    }
    final area = Path.from(line)
      ..lineTo(at(values.length - 1).dx, zeroY)
      ..lineTo(at(0).dx, zeroY)
      ..close();
    canvas.drawPath(
      area,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter, end: Alignment.bottomCenter,
          colors: [chartGold.withValues(alpha: .28), chartGold.withValues(alpha: 0)],
        ).createShader(Rect.fromLTWH(0, top, size.width, zeroY - top)),
    );
    canvas.drawPath(
      line,
      Paint()
        ..color = chartGold
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.4
        ..strokeJoin = StrokeJoin.round
        ..strokeCap = StrokeCap.round,
    );

    final maxI = values.lastIndexOf(maxV);
    for (var i = 0; i < values.length; i++) {
      final p = at(i);
      final big = i == maxI || i == values.length - 1;
      canvas.drawCircle(p, big ? 5 : 3, Paint()..color = chartGold);
      if (big) canvas.drawCircle(p, 5, Paint()..color = C.surface..style = PaintingStyle.stroke..strokeWidth = 1.6);
    }
    canvas.restore();

    if (t > .95) {
      final p = at(maxI);
      final label = _text('$maxV', T.label(14, color: C.goldSoft));
      final x = (p.dx - label.width / 2).clamp(0.0, size.width - label.width);
      label.paint(canvas, Offset(x, p.dy - label.height - 6));
    }
  }

  @override
  bool shouldRepaint(_LinePainter old) => old.t != t || old.values != values;
}
