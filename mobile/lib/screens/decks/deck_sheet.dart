import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../game/models.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/playing_card.dart';

const _fontLabels = {'gotisch': 'Gotisch', 'klassisch': 'Klassisch', 'verspielt': 'Verspielt'};
const _patternLabels = {
  'rauten': 'Rauten', 'streifen': 'Streifen', 'punkte': 'Tupfen', 'wellen': 'Wellen', 'sterne': 'Sterne', 'schach': 'Schach',
};

/// Short description of a deck's look, e.g. "Gotisch · Rauten".
String deckStyleLine(Deck deck) {
  final font = _fontLabels[deck.font] ?? 'Gotisch';
  final back = deck.back['image'] != null ? 'Foto-Rückseite' : _patternLabels[deck.back['pattern']] ?? 'Rauten';
  return '$font · $back';
}

/// A button in the deck sheet; the sheet closes before [onTap] runs.
typedef DeckSheetAction = ({String label, String icon, bool danger, VoidCallback onTap});

/// Opens the full deck: all 13 faces and the back. Resolves to true when the deck became the default.
/// The first of [actions] is the sheet's main button (e.g. "Bearbeiten").
Future<bool?> showDeckSheet(
  BuildContext context, {
  required Deck deck,
  required bool isDefault,
  required bool own,
  required Future<bool> Function() onMakeDefault,
  List<DeckSheetAction> actions = const [],
}) =>
    showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _DeckSheet(deck: deck, isDefault: isDefault, own: own, onMakeDefault: onMakeDefault, actions: actions),
    );

class _DeckSheet extends StatefulWidget {
  final Deck deck;
  final bool isDefault, own;
  final Future<bool> Function() onMakeDefault;
  final List<DeckSheetAction> actions;
  const _DeckSheet({required this.deck, required this.isDefault, required this.own, required this.onMakeDefault, this.actions = const []});

  @override
  State<_DeckSheet> createState() => _DeckSheetState();
}

class _DeckSheetState extends State<_DeckSheet> {
  bool _busy = false;

  Future<void> _makeDefault() async {
    setState(() => _busy = true);
    final ok = await widget.onMakeDefault();
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.pop(context, true);
  }

  void _run(DeckSheetAction action) {
    Navigator.pop(context);
    action.onTap();
  }

  @override
  Widget build(BuildContext context) {
    final deck = widget.deck;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: .86,
      minChildSize: .5,
      maxChildSize: .95,
      builder: (context, scroll) => LayoutBuilder(builder: (context, box) {
        const pad = 20.0, gap = 10.0;
        final cols = box.maxWidth >= 560 ? 5 : 4;
        final cardW = ((box.maxWidth - pad * 2 - gap * (cols - 1)) / cols).floorToDouble();
        return ListView(
          controller: scroll,
          padding: EdgeInsets.fromLTRB(pad, 0, pad, MediaQuery.paddingOf(context).bottom + 28),
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              CardBack(deck: deck, width: 74)
                  .animate()
                  .fadeIn(duration: 300.ms)
                  .rotate(begin: -.03, end: 0, duration: 500.ms, curve: Curves.easeOutBack),
              const SizedBox(width: 16),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(deck.name, style: T.display(32), maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Text(deckStyleLine(deck), style: T.body(15, color: C.inkSoft)),
                  const SizedBox(height: 10),
                  Wrap(spacing: 8, runSpacing: 6, children: [
                    Pill(widget.own ? 'Eigenes Deck' : 'Vorlage', icon: widget.own ? Icons.brush_rounded : Icons.auto_awesome_rounded),
                    if (widget.isDefault) Pill('Standard', icon: Icons.check_rounded, color: C.gold, textColor: C.onGold),
                  ]),
                ]),
              ),
            ]),
            const SizedBox(height: 18),
            if (widget.actions.isNotEmpty) ...[
              GoldButton(label: widget.actions.first.label, jicon: widget.actions.first.icon, onPressed: () => _run(widget.actions.first)),
              const SizedBox(height: 10),
            ],
            if (widget.isDefault)
              Panel(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(children: [
                  const Icon(Icons.verified_rounded, color: C.gold),
                  const SizedBox(width: 10),
                  Expanded(child: Text('Mit diesem Deck kommst du an jeden Tisch.', style: T.body(15, color: C.inkSoft))),
                ]),
              )
            else if (widget.actions.isNotEmpty)
              SoftButton(label: 'Als Standard', jicon: 'star', onPressed: _busy ? null : _makeDefault)
            else
              GoldButton(label: 'Als Standard', icon: Icons.check_rounded, busy: _busy, onPressed: _makeDefault),
            for (final a in widget.actions.skip(1)) ...[
              const SizedBox(height: 10),
              SoftButton(label: a.label, jicon: a.icon, danger: a.danger, onPressed: () => _run(a)),
            ],
            const SizedBox(height: 8),
            const SectionTitle('Die 13 Karten'),
            Wrap(spacing: gap, runSpacing: gap + 2, children: [
              for (var rank = 1; rank <= 13; rank++)
                PlayingCard(rank: rank, deck: deck, width: cardW)
                    .animate(delay: (40 * rank).ms)
                    .fadeIn(duration: 260.ms)
                    .scaleXY(begin: .9, end: 1, duration: 320.ms, curve: Curves.easeOutBack),
            ]),
            const SectionTitle('Rückseite'),
            Center(child: CardBack(deck: deck, width: cardW * 1.6)).animate(delay: 300.ms).fadeIn(),
          ],
        );
      }),
    );
  }
}
