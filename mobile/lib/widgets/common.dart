import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:flutter_svg/flutter_svg.dart';

import '../api.dart';
import '../game/models.dart';
import '../theme.dart';
import 'jakob_icons.dart';
import '../i18n/i18n.dart';

/// Short message at the bottom. Texts (also errors from the server) are translated here, so callers
/// can pass the German text as it is.
void toast(BuildContext context, String message, {bool error = false}) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  messenger?.hideCurrentSnackBar();
  messenger?.showSnackBar(SnackBar(
    content: Row(children: [
      Icon(error ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded, color: error ? C.wax : C.gold, size: 20),
      const SizedBox(width: 10),
      Expanded(child: Text(t(message))),
    ]),
    duration: Duration(milliseconds: error ? 3200 : 2200),
  ));
}

/// The one gold call to action on a screen. Presses down like a coin.
class GoldButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  /// A "Hofstaat" icon name (preferred over [icon]).
  final String? jicon;
  final VoidCallback? onPressed;
  final bool busy, expand;
  final bool large;
  const GoldButton({super.key, required this.label, this.icon, this.jicon, this.onPressed, this.busy = false, this.expand = true, this.large = false});

  @override
  State<GoldButton> createState() => _GoldButtonState();
}

class _GoldButtonState extends State<GoldButton> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null && !widget.busy;
    final h = widget.large ? 60.0 : 52.0;
    return Opacity(
      opacity: enabled ? 1 : .5,
      child: GestureDetector(
        onTapDown: enabled ? (_) => setState(() => _down = true) : null,
        onTapCancel: () => setState(() => _down = false),
        onTapUp: enabled
            ? (_) {
                setState(() => _down = false);
                HapticFeedback.lightImpact();
                widget.onPressed!();
              }
            : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 90),
          height: h,
          width: widget.expand ? double.infinity : null,
          padding: const EdgeInsets.symmetric(horizontal: 22),
          transform: Matrix4.translationValues(0, _down ? 3 : 0, 0),
          decoration: BoxDecoration(
            gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [C.goldSoft, C.gold]),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [BoxShadow(color: C.goldDeep, offset: Offset(0, _down ? 1 : 4))],
          ),
          child: Row(mainAxisSize: MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.center, children: [
            if (widget.busy)
              const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: C.onGold))
            else if (widget.jicon != null)
              JIcon(widget.jicon!, color: C.onGold, size: 23)
            else if (widget.icon != null)
              Icon(widget.icon, color: C.onGold, size: 22),
            if (widget.busy || widget.icon != null || widget.jicon != null) const SizedBox(width: 10),
            Flexible(child: Text(widget.label, overflow: TextOverflow.ellipsis, style: T.body(widget.large ? 20 : 17, color: C.onGold, weight: FontWeight.w800))),
          ]),
        ),
      ),
    );
  }
}

/// Quiet secondary action on velvet.
class SoftButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  /// A "Hofstaat" icon name (preferred over [icon]).
  final String? jicon;
  final VoidCallback? onPressed;
  final bool expand, danger;
  const SoftButton({super.key, required this.label, this.icon, this.jicon, this.onPressed, this.expand = true, this.danger = false});

  @override
  Widget build(BuildContext context) {
    final color = danger ? C.wax : C.ink;
    return SizedBox(
      height: 52,
      width: expand ? double.infinity : null,
      child: TextButton(
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.selectionClick();
                onPressed!();
              },
        style: TextButton.styleFrom(
          backgroundColor: C.surfaceHi,
          foregroundColor: color,
          padding: const EdgeInsets.symmetric(horizontal: 18),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: C.line)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (jicon != null)
            ...[JIcon(jicon!, size: 21, color: color), const SizedBox(width: 8)]
          else if (icon != null)
            ...[Icon(icon, size: 20, color: color), const SizedBox(width: 8)],
          Flexible(child: Text(label, overflow: TextOverflow.ellipsis, style: T.body(16, color: color, weight: FontWeight.w700))),
        ]),
      ),
    );
  }
}

/// A velvet glass panel with a fine gold edge.
class Panel extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final Color? color;
  final bool glow;
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.all(18), this.onTap, this.color, this.glow = false});

  @override
  Widget build(BuildContext context) {
    final box = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? C.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: glow ? C.gold.withValues(alpha: .7) : C.line),
        gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.white.withValues(alpha: .045), Colors.transparent]),
        boxShadow: glow ? [BoxShadow(color: C.gold.withValues(alpha: .18), blurRadius: 24)] : null,
      ),
      child: child,
    );
    if (onTap == null) return box;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () {
          HapticFeedback.selectionClick();
          onTap!();
        },
        child: box,
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const SectionTitle(this.text, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 26, bottom: 12),
        child: Row(children: [
          Expanded(child: Text(text, style: T.display(28))),
          ?trailing,
        ]),
      );
}

/// Round portrait: the photo, a bot's drawn portrait, or initials. The picture itself is clipped to
/// the circle and the ring is painted on top, so no square corners show at the edge.
class Avatar extends StatelessWidget {
  final String name;
  final String? url;
  /// Set for bots (their emoji from the game data); the drawn portrait for [name] is shown instead.
  final String? emoji;
  final double size;
  final Color? ring;
  /// Loot frame (item id) drawn around the portrait.
  final String? frame;
  const Avatar({super.key, required this.name, this.url, this.emoji, this.size = 44, this.ring, this.frame});

  factory Avatar.of(Profile? p, {double size = 44, Color? ring}) =>
      Avatar(name: p?.username ?? '?', url: p?.avatarUrl, size: size, ring: ring, frame: p?.lootFrame);

  @override
  Widget build(BuildContext context) {
    final initials = Center(
      child: Text(name.isEmpty ? '?' : name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase(), style: T.display(size * .38, color: C.ink)),
    );
    final isBot = emoji != null;
    final Widget picture = isBot
        ? SvgPicture.network(Api.artUrl(botArtId(name), full: false), fit: BoxFit.cover, placeholderBuilder: (_) => initials)
        : url != null
            ? Image.network(Api.media(url!), fit: BoxFit.cover, errorBuilder: (_, _, _) => initials)
            : initials;
    // Bot portraits bring their own gold rim; others get a fine line unless a ring colour is asked for.
    final ringWidth = ring != null ? 2.5 : (isBot ? 0.0 : 1.0);
    // Loot frames are drawn on a 100-unit canvas with the portrait inside radius 34, so they reach beyond it.
    final frameSize = size * 100 / 68;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(fit: StackFit.expand, clipBehavior: Clip.none, children: [
        ClipOval(child: ColoredBox(color: isBot ? Colors.transparent : const Color(0xFFB4783A), child: picture)),
        if (ringWidth > 0 && frame == null)
          IgnorePointer(
            child: DecoratedBox(decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: ring ?? C.line, width: ringWidth))),
          ),
        if (frame != null)
          Positioned(
            left: (size - frameSize) / 2, top: (size - frameSize) / 2, width: frameSize, height: frameSize,
            child: IgnorePointer(child: SvgPicture.network(Api.lootUrl(frame!), fit: BoxFit.contain)),
          ),
        if (frame != null && ring != null)
          IgnorePointer(
            child: DecoratedBox(decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: ring!, width: 2))),
          ),
      ]),
    );
  }
}

class Pill extends StatelessWidget {
  final String text;
  final Color color, textColor;
  final IconData? icon;
  /// A "Hofstaat" icon name (preferred over [icon]).
  final String? jicon;
  const Pill(this.text, {super.key, this.color = C.surfaceHi, this.textColor = C.ink, this.icon, this.jicon});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (jicon != null)
            ...[JIcon(jicon!, size: 15, color: textColor), const SizedBox(width: 4)]
          else if (icon != null)
            ...[Icon(icon, size: 14, color: textColor), const SizedBox(width: 4)],
          Text(text, style: T.label(13, color: textColor)),
        ]),
      );
}

/// Night sky with a soft gold glow behind every screen.
class Backdrop extends StatelessWidget {
  final Widget child;
  const Backdrop({super.key, required this.child});

  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(center: Alignment(0, -1.1), radius: 1.3, colors: [Color(0xFF3A1F5C), C.velvet, C.night], stops: [0, .45, 1]),
        ),
        child: child,
      );
}

class EmptyNote extends StatelessWidget {
  final String text;
  final IconData icon;
  const EmptyNote(this.text, {super.key, this.icon = Icons.auto_awesome_rounded});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 18),
        child: Row(children: [
          Icon(icon, color: C.gold.withValues(alpha: .7)),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: T.body(15, color: C.inkSoft))),
        ]),
      );
}
