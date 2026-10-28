import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../game/models.dart';
import '../theme.dart';

void toast(BuildContext context, String message, {bool error = false}) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  messenger?.hideCurrentSnackBar();
  messenger?.showSnackBar(SnackBar(
    content: Row(children: [
      Icon(error ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded, color: error ? C.wax : C.gold, size: 20),
      const SizedBox(width: 10),
      Expanded(child: Text(message)),
    ]),
    duration: Duration(milliseconds: error ? 3200 : 2200),
  ));
}

/// The one gold call to action on a screen. Presses down like a coin.
class GoldButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool busy, expand;
  final bool large;
  const GoldButton({super.key, required this.label, this.icon, this.onPressed, this.busy = false, this.expand = true, this.large = false});

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
            else if (widget.icon != null)
              Icon(widget.icon, color: C.onGold, size: 22),
            if (widget.busy || widget.icon != null) const SizedBox(width: 10),
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
  final VoidCallback? onPressed;
  final bool expand, danger;
  const SoftButton({super.key, required this.label, this.icon, this.onPressed, this.expand = true, this.danger = false});

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
          if (icon != null) ...[Icon(icon, size: 20, color: color), const SizedBox(width: 8)],
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

/// Round portrait with initials fallback; bots show their emoji.
class Avatar extends StatelessWidget {
  final String name;
  final String? url, emoji;
  final double size;
  final Color? ring;
  const Avatar({super.key, required this.name, this.url, this.emoji, this.size = 44, this.ring});

  factory Avatar.of(Profile? p, {double size = 44, Color? ring}) => Avatar(name: p?.username ?? '?', url: p?.avatarUrl, size: size, ring: ring);

  @override
  Widget build(BuildContext context) {
    final initials = name.isEmpty ? '?' : name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: emoji != null ? C.surfaceHi : const Color(0xFFB4783A),
        border: Border.all(color: ring ?? C.line, width: ring != null ? 2.5 : 1),
      ),
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      child: url != null
          ? Image.network(Api.media(url!), width: size, height: size, fit: BoxFit.cover, errorBuilder: (_, _, _) => Text(initials, style: T.display(size * .38)))
          : emoji != null
              ? Text(emoji!, style: TextStyle(fontSize: size * .55))
              : Text(initials, style: T.display(size * .38, color: C.ink)),
    );
  }
}

class Pill extends StatelessWidget {
  final String text;
  final Color color, textColor;
  final IconData? icon;
  const Pill(this.text, {super.key, this.color = C.surfaceHi, this.textColor = C.ink, this.icon});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[Icon(icon, size: 14, color: textColor), const SizedBox(width: 4)],
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
