import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/playing_card.dart';
import '../decks/deck_sheet.dart';
import 'gallery_deck.dart';
import 'like_button.dart';

/// Opens a shared deck in full: all 13 faces and the back.
/// Resolves to true when the player asked to copy it (the screen does the copy once the sheet is gone,
/// so its toast is not hidden behind the sheet).
Future<bool?> showGallerySheet(BuildContext context, {required GalleryDeck deck, required bool canCopy}) => showModalBottomSheet<bool>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => _GallerySheet(deck: deck, canCopy: canCopy),
);

class _GallerySheet extends StatelessWidget {
  final GalleryDeck deck;
  final bool canCopy;
  const _GallerySheet({required this.deck, required this.canCopy});

  @override
  Widget build(BuildContext context) {
    final d = deck.deck;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: .86,
      minChildSize: .5,
      maxChildSize: .95,
      // An own messenger, so a failed like shows its toast inside the sheet.
      builder: (context, scroll) => ScaffoldMessenger(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: LayoutBuilder(
            builder: (context, box) {
              const pad = 20.0, gap = 10.0;
              final cols = box.maxWidth >= 560 ? 5 : 4;
              final cardW = ((box.maxWidth - pad * 2 - gap * (cols - 1)) / cols).floorToDouble();
              return ListView(
                controller: scroll,
                padding: EdgeInsets.fromLTRB(pad, 0, pad, MediaQuery.paddingOf(context).bottom + 28),
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CardBack(
                        deck: d,
                        width: 74,
                      ).animate().fadeIn(duration: 300.ms).rotate(begin: -.03, end: 0, duration: 500.ms, curve: Curves.easeOutBack),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(d.name, style: T.display(32), maxLines: 2, overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 4),
                            Text(
                              'von ${deck.ownerName}',
                              style: T.body(15.5, color: C.goldSoft, weight: FontWeight.w700),
                            ),
                            const SizedBox(height: 2),
                            Text(deckStyleLine(d), style: T.body(14.5, color: C.inkSoft)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      LikeButton(deck: deck),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GoldButton(
                          label: 'Kopieren',
                          icon: Icons.content_copy_rounded,
                          onPressed: canCopy ? () => Navigator.pop(context, true) : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Eine Kopie landet in deinen Decks. Dort kannst du sie im Browser weiter gestalten.',
                    style: T.body(14, color: C.inkMute),
                  ),
                  const SectionTitle('Die 13 Karten'),
                  Wrap(
                    spacing: gap,
                    runSpacing: gap + 2,
                    children: [
                      for (var rank = 1; rank <= 13; rank++)
                        PlayingCard(rank: rank, deck: d, width: cardW)
                            .animate(delay: (40 * rank).ms)
                            .fadeIn(duration: 260.ms)
                            .scaleXY(begin: .9, end: 1, duration: 320.ms, curve: Curves.easeOutBack),
                    ],
                  ),
                  const SectionTitle('Rückseite'),
                  Center(
                    child: CardBack(deck: d, width: cardW * 1.6),
                  ).animate(delay: 300.ms).fadeIn(),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
