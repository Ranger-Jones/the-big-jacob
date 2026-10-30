import 'package:flutter/material.dart';

import '../../game/models.dart';
import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/playing_card.dart';

/// "Deine Decks teilen": each own deck with a switch that hangs it in the gallery or takes it down.
class ShareSection extends StatelessWidget {
  final List<Deck> decks;
  final Set<String> shared, pending;
  final String? error;
  final void Function(Deck deck, bool public) onChanged;
  const ShareSection({super.key, required this.decks, required this.shared, required this.pending, required this.onChanged, this.error});

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      SectionTitle(t('Deine Decks teilen')),
      Text(t('Geteilte Decks sehen alle in der Galerie. Du kannst sie jederzeit wieder privat stellen.'), style: T.body(15, color: C.inkSoft)),
      const SizedBox(height: 12),
      if (error != null)
        EmptyNote(t(error!), icon: Icons.wifi_off_rounded)
      else if (decks.isEmpty)
        EmptyNote(
          t('Du hast noch keine eigenen Decks. Kopiere eins aus der Galerie oder gestalte eins im Browser.'),
          icon: Icons.style_rounded,
        )
      else
        for (final d in decks)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _ShareRow(deck: d, public: shared.contains(d.id), busy: pending.contains(d.id), onChanged: (v) => onChanged(d, v)),
          ),
    ],
  );
}

class _ShareRow extends StatelessWidget {
  final Deck deck;
  final bool public, busy;
  final ValueChanged<bool> onChanged;
  const _ShareRow({required this.deck, required this.public, required this.busy, required this.onChanged});

  @override
  Widget build(BuildContext context) => MergeSemantics(
    child: Panel(
      glow: public,
      padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
      onTap: busy ? null : () => onChanged(!public),
      child: Row(
        children: [
          CardBack(deck: deck, width: 38),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  deck.name,
                  style: T.body(17, weight: FontWeight.w800),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: Row(
                    key: ValueKey(public),
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(public ? Icons.public_rounded : Icons.lock_outline_rounded, size: 15, color: public ? C.gold : C.inkMute),
                      const SizedBox(width: 5),
                      Text(public ? t('In der Galerie') : t('Privat'), style: T.body(14, color: public ? C.goldSoft : C.inkMute)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Switch(value: public, onChanged: busy ? null : onChanged),
        ],
      ),
    ),
  );
}
