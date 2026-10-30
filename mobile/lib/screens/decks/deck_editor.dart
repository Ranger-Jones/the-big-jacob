import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../api.dart';
import '../../game/models.dart';
import '../../game/rules.dart';
import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/jakob_icons.dart';
import '../../widgets/playing_card.dart';
import 'card_studio.dart';
import 'deck_draft.dart';
import 'editor_controls.dart';

/// How many of each rank are in the pack (rank 1 once … rank 12 twelve times, jesters twice).
int copiesOf(int rank) => rank == jester ? 2 : rank;

enum _Tab { karte, stil, rueckseite }

/// The deck editor (port of the web's deck editor): live previews of the chosen card and the back,
/// every setting of the design, saving, renaming, default and deleting.
class DeckEditorScreen extends StatefulWidget {
  final Deck deck;
  final List<ArtGroup> art;
  final bool isDefault;
  const DeckEditorScreen({super.key, required this.deck, required this.art, required this.isDefault});

  @override
  State<DeckEditorScreen> createState() => _DeckEditorScreenState();
}

class _DeckEditorScreenState extends State<DeckEditorScreen> {
  late final DeckDraft _draft = DeckDraft(widget.deck)..addListener(_changed);
  int _rank = 1;
  _Tab _tab = _Tab.karte;
  bool _saving = false;
  late bool _isDefault = widget.isDefault;
  Object? _uploading;
  final _strip = ScrollController();

  @override
  void dispose() {
    _draft.dispose();
    _strip.dispose();
    super.dispose();
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  // Actions -------------------------------------------------------------------------------------------

  Future<bool> _save() async {
    final problem = _draft.problem();
    if (problem != null) {
      toast(context, problem, error: true);
      return false;
    }
    setState(() => _saving = true);
    final res = await Api.post('deck', {'op': 'update', 'id': _draft.id, 'name': _draft.name.trim(), 'design': _draft.payload()});
    if (!mounted) return false;
    setState(() => _saving = false);
    if (!res.ok) {
      toast(context, res.error!, error: true);
      return false;
    }
    HapticFeedback.mediumImpact();
    _draft.markSaved();
    toast(context, t('Deck gespeichert'));
    return true;
  }

  Future<void> _rename() async {
    final name = await showNameSheet(context, title: t('Deck umbenennen'), initial: _draft.name);
    if (name != null) _draft.name = name;
  }

  Future<void> _makeDefault() async {
    final res = await Api.post('deck', {'id': _draft.id});
    if (!mounted) return;
    if (!res.ok) return toast(context, res.error!, error: true);
    setState(() => _isDefault = true);
    toast(context, t('„{name}“ ist jetzt dein Standard-Deck.', {'name': _draft.name}));
  }

  Future<void> _delete() async {
    final ok = await confirmSheet(context,
        title: t('Deck löschen?'), text: t('„{name}“ und alle hochgeladenen Kartenbilder werden gelöscht.', {'name': widget.deck.name}), confirm: t('Löschen'));
    if (!ok || !mounted) return;
    final res = await Api.post('deck', {'op': 'delete', 'id': _draft.id});
    if (!mounted) return;
    if (!res.ok) return toast(context, res.error!, error: true);
    toast(context, t('Deck gelöscht'));
    Navigator.pop(context, true);
  }

  Future<void> _menu() async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(_draft.name, style: T.display(30), maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 14),
            ToolButton(icon: 'pencil', label: t('Umbenennen'), onTap: () => Navigator.pop(ctx, 'rename')),
            const SizedBox(height: 10),
            ToolButton(icon: 'star', label: _isDefault ? t('Ist dein Standard-Deck') : t('Als Standard-Deck'), onTap: _isDefault ? null : () => Navigator.pop(ctx, 'default')),
            const SizedBox(height: 10),
            ToolButton(icon: 'close', label: t('Deck löschen'), danger: true, onTap: () => Navigator.pop(ctx, 'delete')),
          ]),
        ),
      ),
    );
    if (!mounted) return;
    switch (choice) {
      case 'rename':
        await _rename();
      case 'default':
        await _makeDefault();
      case 'delete':
        await _delete();
    }
  }

  bool _isUploading(Object slot) => _uploading == slot;

  /// Picks a photo for card [slot] (1–13) or 'back', uploads it and puts it into the design.
  Future<void> _uploadPhoto(Object slot) async {
    if (_uploading != null) return;
    final tall = slot == 'back' || _draft.design['photoFit'] == 'vollbild';
    final pick = await pickDeckPhoto(context, tall: tall);
    if (!mounted) return;
    final List<int> bytes;
    switch (pick) {
      case PhotoCancelled():
        return;
      case PhotoFailed(:final message):
        return toast(context, message, error: true);
      case PhotoBytes(bytes: final b):
        bytes = b;
    }
    setState(() => _uploading = slot);
    final res = await Api.post('deckImage', {'id': _draft.id, 'slot': slot, 'data': base64Encode(bytes)});
    if (!mounted) return;
    setState(() => _uploading = null);
    final data = res.data;
    final url = data is Map ? data['url'] as String? : null;
    if (url == null) return toast(context, res.error ?? t('Das Bild konnte nicht hochgeladen werden.'), error: true);
    if (slot == 'back') {
      _draft.setBackFields({'image': url, 'zoom': 1, 'panX': 0, 'panY': 0});
    } else {
      _draft.setCard(slot as int, 'image', url);
    }
    toast(context, t('Bild eingesetzt – vergiss nicht zu speichern.'));
  }

  Future<void> _pickArt(int rank) async {
    final id = await showArtPicker(context, title: rank == jester ? t('Grafik für den Narren') : t('Grafik für Karte {rank}', {'rank': rank}), groups: widget.art);
    if (id == null) return;
    _draft.setCardFields(rank, {'art': id, 'image': null});
  }

  Future<void> _pickBackArt() async {
    final id = await showArtPicker(context, title: t('Wappen-Grafik wählen'), groups: widget.art);
    if (id != null) _draft.setBack('art', id);
  }

  void _openStudio() => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CardStudioScreen(draft: _draft, rank: _rank, onUploadPhoto: _uploadPhoto, onPickArt: _pickArt, isUploading: _isUploading),
        ),
      );

  void _selectRank(int rank) {
    HapticFeedback.selectionClick();
    setState(() {
      _rank = rank;
      _tab = _Tab.karte;
    });
  }

  Future<void> _leave() async {
    final discard = await confirmSheet(context,
        title: t('Änderungen verwerfen?'), text: t('Du hast ungespeicherte Änderungen an diesem Deck.'), confirm: t('Verwerfen'));
    if (discard && mounted) Navigator.pop(context, true);
  }

  // Build ---------------------------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final deck = _draft.deck;
    return PopScope(
      canPop: !_draft.dirty,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _leave();
      },
      child: Backdrop(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            surfaceTintColor: Colors.transparent,
            foregroundColor: C.ink,
            titleSpacing: 0,
            title: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: _rename,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Flexible(child: Text(_draft.name, style: T.display(26), maxLines: 1, overflow: TextOverflow.ellipsis)),
                  const SizedBox(width: 6),
                  const JIcon('pencil', size: 18, color: C.inkMute),
                ]),
              ),
            ),
            actions: [
              IconButton(tooltip: t('Rückgängig'), onPressed: _draft.canUndo ? _draft.undo : null, icon: JIcon('undo', color: _draft.canUndo ? C.ink : C.inkMute)),
              IconButton(tooltip: t('Wiederholen'), onPressed: _draft.canRedo ? _draft.redo : null, icon: JIcon('redo', color: _draft.canRedo ? C.ink : C.inkMute)),
              IconButton(tooltip: t('Mehr'), onPressed: _menu, icon: const Icon(Icons.more_horiz_rounded)),
            ],
          ),
          body: Column(children: [
            _preview(deck),
            _rankStrip(deck),
            Padding(padding: const EdgeInsets.fromLTRB(16, 4, 16, 10), child: _tabs()),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                children: switch (_tab) {
                  _Tab.karte => _cardControls(deck),
                  _Tab.stil => _styleControls(),
                  _Tab.rueckseite => _backControls(deck),
                },
              ),
            ),
            _saveBar(),
          ]),
        ),
      ),
    );
  }

  Widget _preview(Deck deck) {
    final screen = MediaQuery.sizeOf(context);
    final faceW = math.min(150.0, math.min(screen.width * .36, screen.height * .2 / 1.4)).floorToDouble();
    final backW = (faceW * .72).floorToDouble();
    Widget caption(String text) => Padding(padding: const EdgeInsets.only(top: 6), child: Text(text, style: T.label(13, color: C.inkSoft)));
    final face = deck.face(_rank);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
        GestureDetector(
          onTap: _openStudio,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Semantics(
              button: true,
              label: t('Karte {rank} frei gestalten', {'rank': _rank}),
              child: PlayingCard(rank: _rank, deck: deck, width: faceW),
            ),
            caption('${_rank == jester ? t('Narr') : t('Rang {rank}', {'rank': _rank})} · ${t(face.name)}'),
          ]),
        ),
        const SizedBox(width: 22),
        GestureDetector(
          onTap: () => setState(() => _tab = _Tab.rueckseite),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            CardBack(deck: deck, width: backW),
            caption(t('Rückseite')),
          ]),
        ),
      ]),
    );
  }

  Widget _rankStrip(Deck deck) => SizedBox(
        height: 44 * 1.4 + 16,
        child: ListView.separated(
          controller: _strip,
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          itemCount: 13,
          separatorBuilder: (_, _) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final rank = i + 1;
            return Semantics(
              button: true,
              selected: rank == _rank,
              label: rank == jester ? t('Narr bearbeiten') : t('Karte {rank} bearbeiten', {'rank': rank}),
              child: GestureDetector(
                onTap: () => _selectRank(rank),
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 150),
                  opacity: rank == _rank ? 1 : .75,
                  child: PlayingCard(rank: rank, deck: deck, width: 44, selected: rank == _rank),
                ),
              ),
            );
          },
        ),
      );

  Widget _tabs() {
    const tabs = [(_Tab.karte, 'Karte'), (_Tab.stil, 'Stil'), (_Tab.rueckseite, 'Rückseite')];
    return Container(
      height: 48,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: C.velvet, borderRadius: BorderRadius.circular(99), border: Border.all(color: C.line)),
      child: Row(children: [
        for (final (tab, label) in tabs)
          Expanded(
            child: Semantics(
              button: true,
              selected: tab == _tab,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _tab = tab);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(99),
                    gradient: tab == _tab ? const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [C.goldSoft, C.gold]) : null,
                  ),
                  child: Text(t(label), style: T.body(16, color: tab == _tab ? C.onGold : C.ink, weight: FontWeight.w800)),
                ),
              ),
            ),
          ),
      ]),
    );
  }

  List<Widget> _cardControls(Deck deck) {
    final rank = _rank;
    final c = _draft.card(rank);
    final art = c['art'] as String?;
    final image = c['image'] as String?;
    final custom = c['layout'] is Map;
    return [
      EditorGroup(
        title: rank == jester ? t('Narr') : t('Karte {rank}', {'rank': rank}),
        hint: t('Kommt {count}× ins Spiel. Die Zahl bestimmt den Rang und bleibt fest.', {'count': copiesOf(rank)}),
        children: [
          DraftTextField(label: t('Name'), value: c['name'] as String? ?? '', maxLength: 24, onChanged: (v) => _draft.setCard(rank, 'name', v, key: '$rank-name')),
          SymbolField(label: t('Symbol'), value: c['emoji'] as String? ?? '', onChanged: (v) => _draft.setCard(rank, 'emoji', v, key: '$rank-emoji')),
        ],
      ),
      EditorGroup(
        title: t('Bild'),
        hint: t('Wahlweise eine gezeichnete Grafik oder ein eigenes Foto statt des Symbols.'),
        children: [
          Row(children: [
            if (art != null) ...[
              SizedBox(width: 44, height: 44, child: SvgPicture.network(Api.artUrl(art, full: false))),
              const SizedBox(width: 8),
            ],
            Expanded(child: ToolButton(icon: 'palette', label: art != null ? t('Grafik ändern') : t('Grafik wählen'), onTap: () => _pickArt(rank))),
            if (art != null) ...[
              const SizedBox(width: 8),
              ToolButton(icon: 'close', tooltip: t('Grafik entfernen'), onTap: () => _draft.setCard(rank, 'art', null)),
            ],
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: ToolButton(
                icon: 'camera', label: image != null ? t('Foto ändern') : t('Foto einsetzen'), busy: _isUploading(rank),
                onTap: _uploading == null ? () => _uploadPhoto(rank) : null,
              ),
            ),
            if (image != null) ...[
              const SizedBox(width: 8),
              ToolButton(icon: 'close', tooltip: t('Foto entfernen'), onTap: () => _draft.setCard(rank, 'image', null)),
            ],
          ]),
          const SizedBox(height: 10),
        ],
      ),
      EditorGroup(
        title: t('Freie Gestaltung'),
        hint: t('Bild, Zahl und Name verschieben, vergrößern und drehen, Sticker und Text aufkleben.'),
        children: [
          SoftButton(label: custom ? t('Gestaltung bearbeiten') : t('Karte frei gestalten'), jicon: 'pencil', onPressed: _openStudio),
          if (custom) ...[
            const SizedBox(height: 8),
            SoftButton(label: t('Zurück zum Standard-Layout'), jicon: 'undo', onPressed: () => _draft.setCard(rank, 'layout', null)),
          ],
          const SizedBox(height: 8),
        ],
      ),
    ];
  }

  List<Widget> _styleControls() {
    final d = _draft.design;
    String color(String k) => d[k] as String? ?? '#000000';
    return [
      EditorGroup(title: t('Name des Decks'), children: [
        DraftTextField(label: t('Name'), value: _draft.name, maxLength: 40, onChanged: (v) => _draft.name = v),
      ]),
      EditorGroup(title: t('Farben der Vorderseite'), children: [
        ColorField(label: t('Rahmen'), value: color('frame'), onChanged: (v) => _draft.set('frame', v, key: 'color-frame')),
        ColorField(label: t('Zahlen'), value: color('accent'), onChanged: (v) => _draft.set('accent', v, key: 'color-accent')),
        ColorField(label: t('Papier'), value: color('paper'), onChanged: (v) => _draft.set('paper', v, key: 'color-paper')),
        ColorField(label: t('Schrift'), value: color('ink'), onChanged: (v) => _draft.set('ink', v, key: 'color-ink')),
        const SizedBox(height: 6),
      ]),
      EditorGroup(title: t('Schriftart'), children: [
        ChoiceRow(
          value: d['font'] as String? ?? 'gotisch',
          options: [for (final e in fontLabels.entries) (e.key, t(e.value))],
          onChanged: (v) => _draft.set('font', v),
        ),
        const SizedBox(height: 6),
      ]),
      EditorGroup(
        title: t('Bilder auf der Vorderseite'),
        hint: t('„Ganze Karte“: Grafiken und Fotos füllen die komplette Vorderseite – bei Grafiken wird die Zahl groß ins Bild eingearbeitet.'),
        children: [
          ChoiceRow(
            value: d['photoFit'] as String? ?? 'medaillon',
            options: [for (final e in photoFitLabels.entries) (e.key, t(e.value))],
            onChanged: (v) => _draft.set('photoFit', v),
          ),
          const SizedBox(height: 6),
        ],
      ),
    ];
  }

  List<Widget> _backControls(Deck deck) {
    final back = _draft.back;
    final image = back['image'] as String?;
    final art = back['art'] as String?;
    Deck withPattern(String pattern) {
      final d = jsonCopy(_draft.design);
      (d['back'] as Map).addAll(<String, dynamic>{'pattern': pattern, 'image': null});
      return Deck.fromDesign(deck.id, deck.name, d);
    }

    return [
      EditorGroup(title: t('Muster'), hint: image != null ? t('Das Foto deckt das Muster gerade zu.') : null, children: [
        LayoutBuilder(builder: (context, box) {
          final w = ((box.maxWidth - 3 * 10) / 4).floorToDouble().clamp(40.0, 80.0);
          return Wrap(spacing: 10, runSpacing: 10, children: [
            for (final e in patternLabels.entries)
              Semantics(
                button: true,
                selected: back['pattern'] == e.key,
                label: t('Muster {name}', {'name': t(e.value)}),
                child: GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    _draft.setBack('pattern', e.key);
                  },
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(w * .14),
                        border: Border.all(color: back['pattern'] == e.key ? C.gold : Colors.transparent, width: 2.5),
                      ),
                      child: CardBack(deck: withPattern(e.key), width: w - 10),
                    ),
                    const SizedBox(height: 4),
                    Text(t(e.value), style: T.label(13, color: back['pattern'] == e.key ? C.goldSoft : C.inkSoft)),
                  ]),
                ),
              ),
          ]);
        }),
        const SizedBox(height: 10),
      ]),
      EditorGroup(title: t('Farben der Rückseite'), children: [
        ColorField(label: t('Grundfarbe'), value: back['a'] as String? ?? '#6b1e2e', onChanged: (v) => _draft.setBack('a', v, key: 'back-a')),
        ColorField(label: t('Musterfarbe'), value: back['b'] as String? ?? '#8e2f40', onChanged: (v) => _draft.setBack('b', v, key: 'back-b')),
        const SizedBox(height: 6),
      ]),
      EditorGroup(title: t('Wappen'), hint: t('Die Grafik steht statt des Symbols in der Mitte.'), children: [
        SymbolField(label: t('Wappen (Emoji oder Kürzel)'), value: back['emblem'] as String? ?? '', onChanged: (v) => _draft.setBack('emblem', v, key: 'back-emblem')),
        const SizedBox(height: 6),
        Row(children: [
          if (art != null) ...[
            SizedBox(width: 44, height: 44, child: SvgPicture.network(Api.artUrl(art, full: false))),
            const SizedBox(width: 8),
          ],
          Expanded(child: ToolButton(icon: 'palette', label: art != null ? t('Wappen-Grafik ändern') : t('Wappen-Grafik wählen'), onTap: _pickBackArt)),
          if (art != null) ...[
            const SizedBox(width: 8),
            ToolButton(icon: 'close', tooltip: t('Wappen-Grafik entfernen'), onTap: () => _draft.setBack('art', null)),
          ],
        ]),
        const SizedBox(height: 10),
      ]),
      EditorGroup(title: t('Foto über die ganze Rückseite'), hint: t('Ersetzt Muster und Wappen.'), children: [
        Row(children: [
          Expanded(
            child: ToolButton(
              icon: 'camera', label: image != null ? t('Foto ändern') : t('Foto einsetzen'), busy: _isUploading('back'),
              onTap: _uploading == null ? () => _uploadPhoto('back') : null,
            ),
          ),
          if (image != null) ...[
            const SizedBox(width: 8),
            ToolButton(icon: 'close', tooltip: t('Rückseitenfoto entfernen'), onTap: () => _draft.setBack('image', null)),
          ],
        ]),
        if (image != null) ...[
          const SizedBox(height: 6),
          LabeledSlider(label: t('Zoom'), value: (back['zoom'] as num? ?? 1) * 100, min: 100, max: 500, unit: ' %',
              onChanged: (v) => _draft.setBack('zoom', v.round() / 100, key: 'back-zoom')),
          LabeledSlider(label: t('Waagerecht'), value: (back['panX'] as num? ?? 0).toDouble(), min: -100, max: 100,
              onChanged: (v) => _draft.setBack('panX', v.roundToDouble(), key: 'back-panX')),
          LabeledSlider(label: t('Senkrecht'), value: (back['panY'] as num? ?? 0).toDouble(), min: -100, max: 100,
              onChanged: (v) => _draft.setBack('panY', v.roundToDouble(), key: 'back-panY')),
        ],
        const SizedBox(height: 10),
      ]),
    ];
  }

  Widget _saveBar() => Container(
        padding: EdgeInsets.fromLTRB(16, 10, 16, MediaQuery.paddingOf(context).bottom + 10),
        decoration: BoxDecoration(color: C.night.withValues(alpha: .92), border: const Border(top: BorderSide(color: C.line))),
        child: Row(children: [
          Expanded(
            child: Text(_draft.dirty ? t('Ungespeicherte Änderungen') : t('Alles gespeichert'),
                style: T.body(15, color: _draft.dirty ? C.goldSoft : C.inkSoft, weight: FontWeight.w700)),
          ),
          GoldButton(label: _saving ? t('Speichert …') : t('Speichern'), jicon: 'check', expand: false, busy: _saving, onPressed: _draft.dirty ? _save : null),
        ]),
      );
}
