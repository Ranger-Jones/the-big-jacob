import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../api.dart';
import '../game/models.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'decks/deck_fan.dart';
import 'decks/deck_sheet.dart';

const _webDecks = 'the-big-jacob.vercel.app/decks';

/// The player's deck chest: own decks and presets, pick the one you bring to the table.
class DecksScreen extends StatefulWidget {
  const DecksScreen({super.key});

  @override
  State<DecksScreen> createState() => _DecksScreenState();
}

class _DecksScreenState extends State<DecksScreen> {
  List<Deck> _presets = const [], _mine = const [];
  String? _defaultId, _error, _saving;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final res = await Api.get('decks');
    if (!mounted) return;
    setState(() {
      _loaded = true;
      if (!res.ok) {
        _error = res.error;
        return;
      }
      final d = res.data as Map;
      List<Deck> parse(Object? list) => ((list as List?) ?? const []).whereType<Map>().map(Deck.from).toList();
      _presets = parse(d['presets']);
      _mine = parse(d['mine']);
      _defaultId = d['defaultId'] as String?;
      _error = null;
    });
  }

  /// Makes [deck] the default; returns whether it worked.
  Future<bool> _makeDefault(Deck deck) async {
    setState(() => _saving = deck.id);
    final res = await Api.post('deck', {'id': deck.id});
    if (!mounted) return false;
    setState(() => _saving = null);
    if (!res.ok) {
      toast(context, res.error!, error: true);
      return false;
    }
    await _load();
    if (mounted) toast(context, '„${deck.name}“ ist jetzt dein Standard-Deck.');
    return true;
  }

  void _open(Deck deck, {required bool own}) => showDeckSheet(
        context,
        deck: deck,
        own: own,
        isDefault: deck.id == _defaultId,
        onMakeDefault: () => _makeDefault(deck),
      );

  @override
  Widget build(BuildContext context) {
    var index = 0;
    Widget tile(Deck deck, bool own) {
      final i = index++;
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: _DeckTile(
          deck: deck,
          isDefault: deck.id == _defaultId,
          saving: _saving == deck.id,
          onTap: () => _open(deck, own: own),
          onMakeDefault: _saving == null ? () => _makeDefault(deck) : null,
        ),
      ).animate(delay: (70 * i).ms).fadeIn(duration: 320.ms).slideY(begin: .08, end: 0, curve: Curves.easeOutCubic);
    }

    return Backdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          foregroundColor: C.ink,
          title: Text('Deine Decks', style: T.display(30)),
        ),
        body: !_loaded
            ? const Center(child: CircularProgressIndicator(color: C.gold))
            : RefreshIndicator(
                color: C.gold,
                backgroundColor: C.surface,
                onRefresh: _load,
                child: ListView(
                  padding: EdgeInsets.fromLTRB(18, 0, 18, MediaQuery.paddingOf(context).bottom + 32),
                  children: [
                    Text('Wähle, mit welchem Deck du an den Tisch kommst. Tippe ein Deck an, um alle Karten zu sehen.',
                        style: T.body(15, color: C.inkSoft)),
                    if (_error != null) EmptyNote(_error!, icon: Icons.wifi_off_rounded),
                    if (_error == null || _presets.isNotEmpty) ...[
                      const SectionTitle('Meine Decks'),
                      if (_mine.isEmpty)
                        const EmptyNote('Noch keine eigenen Decks. Gestalte dein erstes im Browser.', icon: Icons.style_rounded)
                      else
                        for (final d in _mine) tile(d, true),
                      const _WebHint(),
                      const SectionTitle('Vorlagen'),
                      for (final d in _presets) tile(d, false),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}

class _DeckTile extends StatelessWidget {
  final Deck deck;
  final bool isDefault, saving;
  final VoidCallback onTap;
  final VoidCallback? onMakeDefault;
  const _DeckTile({required this.deck, required this.isDefault, required this.saving, required this.onTap, this.onMakeDefault});

  @override
  Widget build(BuildContext context) {
    return Panel(
      glow: isDefault,
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(10, 14, 16, 14),
      child: Row(children: [
        Stack(clipBehavior: Clip.none, children: [
          DeckFan(deck: deck, cardWidth: 50),
          if (isDefault)
            Positioned(
              right: 0, top: -4,
              child: Container(
                width: 28, height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: C.gold,
                  border: Border.all(color: C.night, width: 2.5),
                  boxShadow: [BoxShadow(color: C.gold.withValues(alpha: .5), blurRadius: 10)],
                ),
                child: const Icon(Icons.check_rounded, size: 17, color: C.onGold),
              ).animate().scale(begin: const Offset(.4, .4), duration: 380.ms, curve: Curves.easeOutBack),
            ),
        ]),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(deck.name, style: T.display(24), maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text(deckStyleLine(deck), style: T.body(13.5, color: C.inkSoft)),
            const SizedBox(height: 10),
            if (isDefault)
              const Pill('Standard', icon: Icons.check_rounded, color: C.gold, textColor: C.onGold)
            else
              _SmallAction(label: 'Als Standard', busy: saving, onTap: onMakeDefault),
          ]),
        ),
      ]),
    );
  }
}

/// Compact outlined chip-button used inside deck tiles.
class _SmallAction extends StatelessWidget {
  final String label;
  final bool busy;
  final VoidCallback? onTap;
  const _SmallAction({required this.label, required this.busy, this.onTap});

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(99),
          onTap: onTap == null
              ? null
              : () {
                  HapticFeedback.selectionClick();
                  onTap!();
                },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(99), border: Border.all(color: C.gold.withValues(alpha: .6))),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (busy)
                const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: C.gold))
              else
                const Icon(Icons.star_outline_rounded, size: 16, color: C.goldSoft),
              const SizedBox(width: 6),
              Flexible(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: T.label(13.5, color: C.goldSoft))),
            ]),
          ),
        ),
      );
}

/// Deck editing lives on the web; tap copies the address.
class _WebHint extends StatelessWidget {
  const _WebHint();

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Panel(
          color: C.velvet,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          onTap: () async {
            await Clipboard.setData(const ClipboardData(text: 'https://$_webDecks'));
            if (context.mounted) toast(context, 'Link kopiert.');
          },
          child: Row(children: [
            const Icon(Icons.brush_rounded, color: C.gold),
            const SizedBox(width: 12),
            Expanded(
              child: Text.rich(TextSpan(style: T.body(14.5, color: C.inkSoft), children: [
                const TextSpan(text: 'Eigene Decks gestaltest du im Browser unter '),
                TextSpan(text: _webDecks, style: T.body(14.5, color: C.goldSoft, weight: FontWeight.w700)),
              ])),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.copy_rounded, size: 18, color: C.inkMute),
          ]),
        ),
      );
}
