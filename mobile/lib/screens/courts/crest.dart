import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../api.dart';
import '../../i18n/i18n.dart';
import '../../theme.dart';

/// A court's coat of arms: a card illustration on a round velvet medallion with a gold ring.
class Crest extends StatelessWidget {
  final String id;
  final double size;
  const Crest({super.key, required this.id, this.size = 64});

  @override
  Widget build(BuildContext context) {
    final ring = (size * .05).clamp(2.5, 6.0);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const RadialGradient(center: Alignment(-.2, -.4), radius: .9, colors: [C.surfaceHi, C.night]),
        border: Border.all(color: C.gold, width: ring),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .45), blurRadius: size * .22, offset: Offset(0, size * .07))],
      ),
      alignment: Alignment.center,
      child: id.isEmpty
          ? Icon(Icons.shield_outlined, color: C.gold.withValues(alpha: .6), size: size * .45)
          : SizedBox(
              width: size * .72,
              height: size * .72,
              child: SvgPicture.network(
                Api.artUrl(id, full: false),
                fit: BoxFit.contain,
                placeholderBuilder: (_) => const SizedBox.shrink(),
              ),
            ),
    );
  }
}

/// A scrollable grid of all crests; the chosen one is lifted and ringed in gold.
class CrestPicker extends StatelessWidget {
  final List<String> crests;
  final String? value;
  final ValueChanged<String> onChanged;
  final double height;
  const CrestPicker({super.key, required this.crests, required this.value, required this.onChanged, this.height = 228});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: C.night.withValues(alpha: .55),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: C.line),
      ),
      child: crests.isEmpty
          ? Center(child: Text(t('Keine Wappen geladen.'), style: T.body(15, color: C.inkMute)))
          : Semantics(
              label: t('Wappen'),
              child: GridView.builder(
                padding: EdgeInsets.zero,
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 64, mainAxisSpacing: 8, crossAxisSpacing: 8),
                itemCount: crests.length,
                itemBuilder: (_, i) => _CrestTile(
                  id: crests[i],
                  index: i,
                  selected: crests[i] == value,
                  onTap: () => onChanged(crests[i]),
                ),
              ),
            ),
    );
  }
}

class _CrestTile extends StatelessWidget {
  final String id;
  final int index;
  final bool selected;
  final VoidCallback onTap;
  const _CrestTile({required this.id, required this.index, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: t('Wappen {n}', {'n': index + 1}),
      child: AnimatedScale(
        scale: selected ? 1.06 : 1,
        duration: const Duration(milliseconds: 160),
        curve: Curves.easeOutBack,
        child: AnimatedOpacity(
          opacity: selected ? 1 : .72,
          duration: const Duration(milliseconds: 160),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                HapticFeedback.selectionClick();
                onTap();
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: selected ? C.surfaceHi : C.velvet,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: selected ? C.gold : C.line, width: selected ? 2.5 : 1),
                  boxShadow: selected ? [BoxShadow(color: C.gold.withValues(alpha: .25), blurRadius: 12)] : null,
                ),
                child: SvgPicture.network(Api.artUrl(id, full: false), fit: BoxFit.contain, placeholderBuilder: (_) => const SizedBox.shrink()),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
