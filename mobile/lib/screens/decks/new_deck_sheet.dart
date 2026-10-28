import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/models.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/jakob_icons.dart';
import 'deck_draft.dart';
import 'deck_fan.dart';

/// Start of a new deck: blank or from a preset. Resolves to 'blank', a preset id, or null.
Future<String?> showNewDeckSheet(BuildContext context, {required List<Deck> presets}) => showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: .86,
        minChildSize: .5,
        maxChildSize: .95,
        builder: (ctx, scroll) {
          final blank = Deck.fromDesign('blank', 'Leeres Deck', blankDesign());
          var i = 0;
          Widget option(Deck deck, String value, String subtitle) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Panel(
                  onTap: () => Navigator.pop(ctx, value),
                  padding: const EdgeInsets.fromLTRB(8, 12, 14, 12),
                  child: Row(children: [
                    DeckFan(deck: deck, cardWidth: 40, animate: false),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(deck.name, style: T.display(22), maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text(subtitle, style: T.body(14, color: C.inkSoft)),
                      ]),
                    ),
                    const JIcon('plus', color: C.goldSoft),
                  ]),
                ),
              ).animate(delay: (40 * i++).ms).fadeIn(duration: 240.ms).slideY(begin: .06, end: 0);
          return ListView(
            controller: scroll,
            padding: EdgeInsets.fromLTRB(18, 0, 18, MediaQuery.paddingOf(ctx).bottom + 24),
            children: [
              Text('Neues Deck', style: T.display(32)),
              const SizedBox(height: 4),
              Text('Fang mit einem leeren Deck an oder nimm eine Vorlage und mach sie zu deiner.', style: T.body(15, color: C.inkSoft)),
              const SizedBox(height: 16),
              option(blank, 'blank', 'Schlichtes Pergament, alles selbst gestalten'),
              const SectionTitle('Aus einer Vorlage'),
              for (final p in presets) option(p, p.id, 'Vorlage'),
            ],
          );
        },
      ),
    );
