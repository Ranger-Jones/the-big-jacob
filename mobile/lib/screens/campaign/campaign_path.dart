import 'dart:math' as math;
import 'dart:ui' show PathMetric;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../theme.dart';
import '../../widgets/jakob_icons.dart';

/// One station of the campaign as sent by `GET campaign`.
class Stage {
  final int level, bots;
  final String place, title, emoji, story, twist;
  const Stage(this.level, this.place, this.title, this.emoji, this.story, this.twist, this.bots);

  factory Stage.from(Map m) => Stage(
        (m['level'] as num?)?.toInt() ?? 0,
        m['place'] as String? ?? '',
        m['title'] as String? ?? '',
        m['emoji'] as String? ?? '🏰',
        m['story'] as String? ?? '',
        m['twist'] as String? ?? '',
        (m['bots'] as num?)?.toInt() ?? 0,
      );
}

enum StageState { won, next, locked }

StageState stageState(int stageLevel, int wonLevel) =>
    stageLevel <= wonLevel ? StageState.won : stageLevel == wonLevel + 1 ? StageState.next : StageState.locked;

/// Height of one station row on the road.
const stationHeight = 156.0;
const _nodeSize = 76.0;

/// Horizontal centre of a station's node: stations zig-zag left and right.
double nodeX(int level, double width) => level.isOdd ? width * .27 : width * .73;

/// One row of the road: the node on one side, the label on the other, and the road running through.
class StationRow extends StatelessWidget {
  final Stage stage;
  final StageState state;
  final bool first, last, busy;
  final VoidCallback onTap;
  const StationRow({super.key, required this.stage, required this.state, required this.first, required this.last, required this.busy, required this.onTap});

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, box) {
        final w = box.maxWidth;
        final x = nodeX(stage.level, w);
        final left = stage.level.isOdd;
        final labelW = w * .54 - 12;
        return SizedBox(
          height: stationHeight,
          child: Stack(clipBehavior: Clip.none, children: [
            Positioned.fill(
              child: CustomPaint(
                painter: _RoadPainter(
                  nodeX: x,
                  // The lower half is travelled once this station is reachable, the upper half once it is won.
                  lowerTravelled: state != StageState.locked,
                  upperTravelled: state == StageState.won,
                  drawLower: !first,
                  drawUpper: !last,
                ),
              ),
            ),
            Positioned(
              left: x - _nodeSize / 2,
              top: stationHeight / 2 - _nodeSize / 2,
              child: GestureDetector(onTap: onTap, child: StationNode(stage: stage, state: state, busy: busy)),
            ),
            Positioned(
              left: left ? w * .46 : null,
              right: left ? null : w * .46,
              top: 0, bottom: 0, width: labelW,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: onTap,
                child: Align(
                  alignment: left ? Alignment.centerLeft : Alignment.centerRight,
                  child: _StationLabel(stage: stage, state: state, alignEnd: !left),
                ),
              ),
            ),
          ]),
        );
      });
}

class _StationLabel extends StatelessWidget {
  final Stage stage;
  final StageState state;
  final bool alignEnd;
  const _StationLabel({required this.stage, required this.state, required this.alignEnd});

  @override
  Widget build(BuildContext context) {
    final locked = state == StageState.locked;
    final cross = alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start;
    final textAlign = alignEnd ? TextAlign.right : TextAlign.left;
    final (badge, badgeColor) = switch (state) {
      StageState.won => ('Gewonnen', C.gold),
      StageState.next => ('Als Nächstes', C.goldSoft),
      StageState.locked => ('Station ${stage.level}', C.inkMute),
    };
    return Opacity(
      opacity: locked ? .55 : 1,
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: cross, children: [
        Text(badge, style: T.label(12.5, color: badgeColor)),
        const SizedBox(height: 2),
        Text(stage.place, textAlign: textAlign, maxLines: 2, overflow: TextOverflow.ellipsis,
            style: T.display(25, color: locked ? C.inkSoft : C.ink)),
        const SizedBox(height: 2),
        Text('Titel: ${stage.title}', textAlign: textAlign, style: T.body(13.5, color: C.inkSoft)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
          decoration: BoxDecoration(
            color: state == StageState.locked ? C.surface : C.gold.withValues(alpha: .14),
            borderRadius: BorderRadius.circular(99),
            border: Border.all(color: state == StageState.locked ? C.line : C.gold.withValues(alpha: .4)),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.auto_awesome_rounded, size: 13, color: locked ? C.inkMute : C.goldSoft),
            const SizedBox(width: 4),
            Flexible(child: Text(stage.twist, overflow: TextOverflow.ellipsis, style: T.label(12.5, color: locked ? C.inkMute : C.goldSoft))),
          ]),
        ),
      ]),
    );
  }
}

/// The round medallion of a station: gold when won, glowing when next, dim and locked otherwise.
class StationNode extends StatelessWidget {
  final Stage stage;
  final StageState state;
  final bool busy;
  final double size;
  const StationNode({super.key, required this.stage, required this.state, this.busy = false, this.size = _nodeSize});

  @override
  Widget build(BuildContext context) {
    final emoji = JIcon(stageIcons[stage.level] ?? 'castle', size: size * .5, color: state == StageState.won ? C.onGold : C.goldSoft);
    final Widget disc = switch (state) {
      StageState.won => Container(
          width: size, height: size, alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [C.goldSoft, C.gold, C.goldDeep]),
            border: Border.all(color: C.goldSoft, width: 2),
            boxShadow: [BoxShadow(color: C.goldDeep.withValues(alpha: .8), offset: const Offset(0, 4)), BoxShadow(color: C.gold.withValues(alpha: .25), blurRadius: 16)],
          ),
          child: emoji,
        ),
      StageState.next => Container(
          width: size, height: size, alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: C.surfaceHi,
            border: Border.all(color: C.gold, width: 3),
            boxShadow: [BoxShadow(color: C.gold.withValues(alpha: .45), blurRadius: 22, spreadRadius: 2)],
          ),
          child: busy ? const SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.6, color: C.gold)) : emoji,
        ),
      StageState.locked => Container(
          width: size, height: size, alignment: Alignment.center,
          decoration: BoxDecoration(shape: BoxShape.circle, color: C.surface, border: Border.all(color: C.line, width: 2)),
          child: Opacity(
            opacity: .35,
            child: ColorFiltered(colorFilter: const ColorFilter.matrix(_greyscale), child: emoji),
          ),
        ),
    };

    final badge = switch (state) {
      StageState.won => _Badge(icon: Icons.check_rounded, bg: C.vert, fg: Colors.white),
      StageState.locked => _Badge(icon: Icons.lock_rounded, bg: C.surfaceHi, fg: C.inkMute),
      StageState.next => null,
    };

    final node = SizedBox(
      width: size, height: size,
      child: Stack(clipBehavior: Clip.none, alignment: Alignment.center, children: [
        if (state == StageState.next)
          // A soft ripple that keeps drawing the eye to the next station.
          Container(
            width: size, height: size,
            decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: C.gold.withValues(alpha: .7), width: 2)),
          )
              .animate(onPlay: (c) => c.repeat())
              .scaleXY(begin: 1, end: 1.55, duration: 1800.ms, curve: Curves.easeOut)
              .fadeOut(begin: .9, duration: 1800.ms, curve: Curves.easeOut),
        state == StageState.next
            ? disc.animate(onPlay: (c) => c.repeat(reverse: true)).scaleXY(begin: 1, end: 1.06, duration: 1100.ms, curve: Curves.easeInOut)
            : disc,
        if (badge != null) Positioned(right: -2, bottom: -2, child: badge),
      ]),
    );
    return Semantics(button: true, label: '${stage.place}, ${stage.title}', child: node);
  }
}

class _Badge extends StatelessWidget {
  final IconData icon;
  final Color bg, fg;
  const _Badge({required this.icon, required this.bg, required this.fg});

  @override
  Widget build(BuildContext context) => Container(
        width: 26, height: 26,
        decoration: BoxDecoration(shape: BoxShape.circle, color: bg, border: Border.all(color: C.night, width: 2.5)),
        child: Icon(icon, size: 15, color: fg),
      );
}

const _greyscale = <double>[
  .2126, .7152, .0722, 0, 0,
  .2126, .7152, .0722, 0, 0,
  .2126, .7152, .0722, 0, 0,
  0, 0, 0, 1, 0,
];

/// Paints the road through one row: from the bottom centre up to the node and on to the top centre.
class _RoadPainter extends CustomPainter {
  final double nodeX;
  final bool lowerTravelled, upperTravelled, drawLower, drawUpper;
  _RoadPainter({required this.nodeX, required this.lowerTravelled, required this.upperTravelled, required this.drawLower, required this.drawUpper});

  @override
  void paint(Canvas canvas, Size size) {
    final mid = size.width / 2, h = size.height, x = nodeX;
    final lower = Path()
      ..moveTo(mid, h)
      ..cubicTo(mid, h * .8, x, h * .78, x, h / 2);
    final upper = Path()
      ..moveTo(x, h / 2)
      ..cubicTo(x, h * .22, mid, h * .2, mid, 0);
    if (drawLower) _segment(canvas, lower, lowerTravelled);
    if (drawUpper) _segment(canvas, upper, upperTravelled);
  }

  void _segment(Canvas canvas, Path path, bool travelled) {
    // A wide, soft track first, then the trail on top.
    canvas.drawPath(
      path,
      Paint()
        ..color = travelled ? C.gold.withValues(alpha: .12) : Colors.white.withValues(alpha: .035)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 18
        ..strokeCap = StrokeCap.round,
    );
    final trail = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = travelled ? 4 : 3
      ..color = travelled ? C.gold : C.inkMute.withValues(alpha: .55);
    if (travelled) {
      canvas.drawPath(path, trail);
      return;
    }
    for (final PathMetric m in path.computeMetrics()) {
      for (var d = 0.0; d < m.length; d += 14) {
        canvas.drawPath(m.extractPath(d, math.min(d + 6, m.length)), trail);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _RoadPainter old) =>
      old.nodeX != nodeX || old.lowerTravelled != lowerTravelled || old.upperTravelled != upperTravelled || old.drawLower != drawLower || old.drawUpper != drawUpper;
}
