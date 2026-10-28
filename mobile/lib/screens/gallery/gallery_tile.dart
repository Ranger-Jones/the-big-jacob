import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../theme.dart';
import '../../widgets/common.dart';
import '../decks/deck_fan.dart';
import '../decks/deck_sheet.dart';
import 'gallery_deck.dart';
import 'like_button.dart';

/// One shared deck: a small fan, name and owner, then like and copy.
class GalleryTile extends StatelessWidget {
  final GalleryDeck deck;
  final bool copying;
  final VoidCallback onTap;
  final VoidCallback? onCopy;
  const GalleryTile({super.key, required this.deck, required this.copying, required this.onTap, this.onCopy});

  @override
  Widget build(BuildContext context) => Panel(
    onTap: onTap,
    padding: const EdgeInsets.fromLTRB(10, 14, 14, 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            DeckFan(deck: deck.deck, cardWidth: 50, ranks: const [13, 7, 1], animate: false),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(deck.deck.name, style: T.display(24), maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 3),
                  Text(
                    'von ${deck.ownerName}',
                    style: T.body(14.5, color: C.goldSoft, weight: FontWeight.w700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 1),
                  Text(
                    deckStyleLine(deck.deck),
                    style: T.body(13.5, color: C.inkMute),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            LikeButton(deck: deck),
            const Spacer(),
            CopyButton(busy: copying, onTap: onCopy),
          ],
        ),
      ],
    ),
  );
}

/// Outlined gold pill "Kopieren"; shows a spinner while the copy is made.
class CopyButton extends StatelessWidget {
  final bool busy;
  final VoidCallback? onTap;
  const CopyButton({super.key, required this.busy, this.onTap});

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null && !busy;
    return Opacity(
      opacity: enabled || busy ? 1 : .5,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(99),
          onTap: enabled
              ? () {
                  HapticFeedback.selectionClick();
                  onTap!();
                }
              : null,
          child: Container(
            constraints: const BoxConstraints(minHeight: 48),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: C.gold.withValues(alpha: .6)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (busy)
                  const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: C.gold))
                else
                  const Icon(Icons.content_copy_rounded, size: 18, color: C.goldSoft),
                const SizedBox(width: 8),
                Text('Kopieren', style: T.label(15, color: C.goldSoft)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
