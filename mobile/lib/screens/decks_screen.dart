import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../api.dart';
import '../game/models.dart';
import '../i18n/i18n.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'decks/deck_draft.dart';
import 'decks/deck_editor.dart';
import 'decks/deck_fan.dart';
import 'decks/deck_sheet.dart';
import 'decks/editor_controls.dart';
import 'decks/new_deck_sheet.dart';

/// The player's deck chest: own decks and presets, pick the one you bring to the table.
class DecksScreen extends StatefulWidget {
  /// Opens the "new deck" sheet right away (from the gallery's "Eigenes Deck gestalten").
  final bool startCreating;
  const DecksScreen({super.key, this.startCreating = false});

  @override
  State<DecksScreen> createState() => _DecksScreenState();
}

class _DecksScreenState extends State<DecksScreen> {
  List<Deck> _presets = const [], _mine = const [];
  String? _defaultId, _error, _saving;
  List<ArtGroup> _art = const [];
  bool _loaded = false, _creating = false, _startedCreating = false;

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
      _art = ArtGroup.parse(d['art']);
      _error = null;
    });
    if (widget.startCreating && !_startedCreating && res.ok && mounted) {
      _startedCreating = true;
      _create();
    }
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
    if (mounted) toast(context, t('„{name}“ ist jetzt dein Standard-Deck.', {'name': _name(deck)}));
    return true;
  }

  /// Presets carry German names from the game data; own decks keep the name the player gave them.
  String _name(Deck deck) => _mine.contains(deck) ? deck.name : t(deck.name);

  /// Opens the editor for an own deck and reloads afterwards (it may have been changed or deleted).
  Future<void> _edit(Deck deck) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => DeckEditorScreen(deck: deck, art: _art, isDefault: deck.id == _defaultId)),
    );
    if (mounted) await _load();
  }

  static String? _newId(ApiResult<dynamic> res) {
    final data = res.data;
    return data is Map ? data['id'] as String? : null;
  }

  /// Loads the list and opens the deck with [id] (just created) in the editor.
  Future<void> _editNew(String id) async {
    await _load();
    if (!mounted) return;
    final deck = _mine.where((d) => d.id == id).firstOrNull;
    if (deck != null) await _edit(deck);
  }

  Future<void> _create() async {
    final choice = await showNewDeckSheet(context, presets: _presets);
    if (choice == null || !mounted) return;
    setState(() => _creating = true);
    final res = choice == 'blank'
        ? await Api.post('deck', {'op': 'create', 'name': t('Mein Deck'), 'design': blankDesign()})
        : await Api.post('deck', {'op': 'copy', 'id': choice});
    if (!mounted) return;
    setState(() => _creating = false);
    final id = _newId(res);
    if (id == null) return toast(context, res.error ?? t('Das Deck konnte nicht angelegt werden.'), error: true);
    await _editNew(id);
  }

  Future<void> _copy(Deck deck) async {
    final res = await Api.post('deck', {'op': 'copy', 'id': deck.id});
    if (!mounted) return;
    final id = _newId(res);
    if (id == null) return toast(context, res.error ?? t('Das Deck konnte nicht kopiert werden.'), error: true);
    toast(context, t('Kopie von „{name}“ angelegt.', {'name': _name(deck)}));
    await _editNew(id);
  }

  Future<void> _delete(Deck deck) async {
    final ok = await confirmSheet(context,
        title: t('Deck löschen?'), text: t('„{name}“ und alle hochgeladenen Kartenbilder werden gelöscht.', {'name': deck.name}), confirm: t('Löschen'));
    if (!ok || !mounted) return;
    final res = await Api.post('deck', {'op': 'delete', 'id': deck.id});
    if (!mounted) return;
    if (!res.ok) return toast(context, res.error!, error: true);
    toast(context, t('Deck gelöscht'));
    await _load();
  }

  void _open(Deck deck, {required bool own}) => showDeckSheet(
        context,
        deck: deck,
        own: own,
        isDefault: deck.id == _defaultId,
        onMakeDefault: () => _makeDefault(deck),
        actions: own
            ? [
                (label: t('Bearbeiten'), icon: 'pencil', danger: false, onTap: () => _edit(deck)),
                (label: t('Duplizieren'), icon: 'cards', danger: false, onTap: () => _copy(deck)),
                (label: t('Löschen'), icon: 'close', danger: true, onTap: () => _delete(deck)),
              ]
            : [(label: t('Als Vorlage nutzen'), icon: 'pencil', danger: false, onTap: () => _copy(deck))],
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
          own: own,
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
          title: Text(t('Deine Decks'), style: T.display(30)),
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
                    Text(t('Wähle, mit welchem Deck du an den Tisch kommst, oder gestalte dein eigenes. Tippe ein Deck an, um alle Karten zu sehen.'),
                        style: T.body(15, color: C.inkSoft)),
                    if (_error != null) EmptyNote(t(_error!), icon: Icons.wifi_off_rounded),
                    if (_error == null || _presets.isNotEmpty) ...[
                      SectionTitle(t('Meine Decks')),
                      if (_mine.isEmpty)
                        EmptyNote(t('Noch keine eigenen Decks. Leg eins an – leer oder aus einer Vorlage.'), icon: Icons.style_rounded)
                      else
                        for (final d in _mine) tile(d, true),
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: GoldButton(label: t('Neues Deck gestalten'), jicon: 'plus', busy: _creating, onPressed: _creating ? null : _create),
                      ),
                      SectionTitle(t('Vorlagen')),
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
  final bool own, isDefault, saving;
  final VoidCallback onTap;
  final VoidCallback? onMakeDefault;
  const _DeckTile({required this.deck, required this.own, required this.isDefault, required this.saving, required this.onTap, this.onMakeDefault});

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
            Text(own ? deck.name : t(deck.name), style: T.display(24), maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text(deckStyleLine(deck), style: T.body(13.5, color: C.inkSoft)),
            const SizedBox(height: 10),
            if (isDefault)
              Pill(t('Standard'), icon: Icons.check_rounded, color: C.gold, textColor: C.onGold)
            else
              _SmallAction(label: t('Als Standard'), busy: saving, onTap: onMakeDefault),
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
