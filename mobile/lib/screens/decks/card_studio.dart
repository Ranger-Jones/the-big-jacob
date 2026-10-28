import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../game/models.dart';
import '../../game/rules.dart';
import '../../theme.dart';
import '../../widgets/card_layout.dart';
import '../../widgets/common.dart';
import '../../widgets/jakob_icons.dart';
import '../../widgets/playing_card.dart';
import 'deck_draft.dart';
import 'editor_controls.dart';

const _snap = 1.6;

double _clamp(double v, double lo, double hi) => math.min(hi, math.max(lo, v));
double _round(double v) => (v * 10).round() / 10;
double _angle(double deg) {
  var d = deg;
  while (d > 180) {
    d -= 360;
  }
  while (d < -180) {
    d += 360;
  }
  return d.roundToDouble();
}

/// Free card layout on a large canvas (port of the web's card studio): tap an element to select it,
/// drag to move, pinch to scale and turn; the inspector below has every setting as sliders and switches.
class CardStudioScreen extends StatefulWidget {
  final DeckDraft draft;
  final int rank;
  final Future<void> Function(int rank) onUploadPhoto;
  final Future<void> Function(int rank) onPickArt;
  final bool Function(Object slot) isUploading;
  const CardStudioScreen({super.key, required this.draft, required this.rank, required this.onUploadPhoto, required this.onPickArt, required this.isUploading});

  @override
  State<CardStudioScreen> createState() => _CardStudioScreenState();
}

class _CardStudioScreenState extends State<CardStudioScreen> {
  DeckDraft get draft => widget.draft;
  int get rank => widget.rank;

  String? _selected;
  bool _panMode = false;
  bool _guideV = false, _guideH = false;

  // Gesture bookkeeping.
  String? _hit, _downTarget;
  int _pointers = 0;
  String? _gKey;
  Map<String, dynamic>? _start;
  Offset _startFocal = Offset.zero;
  int _gCount = 0;
  double _baseScale = 1, _baseRot = 0;
  bool _pushed = false;
  double _canvasW = 280;

  @override
  void initState() {
    super.initState();
    draft.addListener(_changed);
  }

  @override
  void dispose() {
    draft.removeListener(_changed);
    super.dispose();
  }

  void _changed() {
    if (!mounted) return;
    // A sticker that disappeared (undo) can no longer be selected.
    final sel = _selected;
    if (sel != null && sel.startsWith('sticker:') && _sticker(draft.layoutOf(rank), sel) == null) _selected = null;
    setState(() {});
  }

  Map<String, dynamic>? _sticker(Map<String, dynamic> l, String? key) {
    if (key == null || !key.startsWith('sticker:')) return null;
    for (final s in (l['stickers'] as List? ?? const [])) {
      if ('sticker:${(s as Map)['id']}' == key) return lmap(s);
    }
    return null;
  }

  ({double x, double y, double size, double rotate}) _geometry(Map<String, dynamic> l, String key) {
    if (key == 'picture') {
      final p = lmap(l['picture']);
      final fill = p['fill'] == true;
      return (x: fill ? 50 : lnum(p['x'], 50), y: fill ? 50 : lnum(p['y'], 43), size: lnum(p['size'], 62), rotate: lnum(p['rotate']));
    }
    if (key == 'number' || key == 'name') {
      final n = lmap(l[key]);
      return (x: lnum(n['x'], 50), y: lnum(n['y'], 50), size: lnum(n['size'], 10), rotate: 0);
    }
    final s = _sticker(l, key) ?? const {};
    return (x: lnum(s['x'], 50), y: lnum(s['y'], 50), size: lnum(s['size'], 16), rotate: lnum(s['rotate']));
  }

  /// Writes position/size/rotation (and crop for the picture) into layout [l], clamped like the server allows.
  void _apply(Map<String, dynamic> l, String key, {double? x, double? y, double? size, double? rotate, double? zoom, double? panX, double? panY}) {
    Map<String, dynamic> part(String k) => l[k] = Map<String, dynamic>.from(l[k] as Map);
    if (key == 'picture') {
      final p = part('picture');
      if (x != null) p['x'] = x;
      if (y != null) p['y'] = y;
      if (size != null) p['size'] = _clamp(size, 5, 250);
      if (rotate != null) p['rotate'] = _angle(rotate);
      if (zoom != null) p['zoom'] = _clamp(zoom, 1, 5);
      if (panX != null) p['panX'] = _clamp(panX, -100, 100);
      if (panY != null) p['panY'] = _clamp(panY, -100, 100);
    } else if (key == 'number' || key == 'name') {
      final n = part(key);
      if (x != null) n['x'] = x;
      if (y != null) n['y'] = y;
      if (size != null) n['size'] = key == 'number' ? _clamp(size, 4, 90) : _clamp(size, 3, 25);
    } else {
      l['stickers'] = <dynamic>[
        for (final raw in (l['stickers'] as List? ?? const []))
          if ('sticker:${(raw as Map)['id']}' == key)
            {
              ...Map<String, dynamic>.from(raw),
              'x': ?x,
              'y': ?y,
              if (size != null) 'size': _clamp(size, 3, 90),
              if (rotate != null) 'rotate': _angle(rotate),
            }
          else
            raw,
      ];
    }
  }

  void _setLayout(void Function(Map<String, dynamic> l) fn, {String? key, bool history = true}) =>
      draft.editLayout(rank, fn, key: key, history: history);

  // Gestures -----------------------------------------------------------------------------------------

  Widget _wrap(String key, Widget child) => Listener(
        behavior: HitTestBehavior.opaque,
        onPointerDown: (_) => _hit ??= key,
        child: _selected == key
            ? Container(
                foregroundDecoration: BoxDecoration(border: Border.all(color: C.azure, width: 2), borderRadius: BorderRadius.circular(4)),
                child: child,
              )
            : child,
      );

  void _pointerDown(PointerDownEvent _) {
    if (_pointers == 0) _downTarget = _hit;
    _hit = null;
    _pointers++;
  }

  void _pointerUp(PointerEvent _) => _pointers = math.max(0, _pointers - 1);

  void _begin(String key, ScaleUpdateDetails? d, Offset focal, int count) {
    _gKey = key;
    _start = draft.layoutOf(rank);
    _startFocal = focal;
    _gCount = count;
    _baseScale = d?.scale ?? 1;
    _baseRot = d?.rotation ?? 0;
  }

  void _scaleStart(ScaleStartDetails d) {
    _pushed = false;
    _gKey = null;
    final key = d.pointerCount >= 2 ? _selected : _downTarget;
    if (key == null) return;
    if (_selected != key) setState(() => _selected = key);
    _begin(key, null, d.localFocalPoint, d.pointerCount);
  }

  void _scaleUpdate(ScaleUpdateDetails d) {
    if (_gKey == null) {
      if (d.pointerCount < 2 || _selected == null) return;
      _begin(_selected!, d, d.localFocalPoint, d.pointerCount);
    }
    if (d.pointerCount != _gCount) _begin(_gKey!, d, d.localFocalPoint, d.pointerCount);
    final key = _gKey!, start = _start!;
    final w = _canvasW, h = _canvasW * 1.4;
    final delta = d.localFocalPoint - _startFocal;
    if (delta.distance < 1 && (d.scale / _baseScale - 1).abs() < .01 && (d.rotation - _baseRot).abs() < .01) return;
    if (!_pushed) {
      draft.checkpoint();
      _pushed = true;
    }
    final geo = _geometry(start, key);
    final picture = lmap(start['picture']);
    final fill = key == 'picture' && picture['fill'] == true;
    final face = draft.deck.face(rank);
    final drawn = face.image == null && face.art != null;
    var v = false, hz = false;

    _setLayout((l) {
      l
        ..clear()
        ..addAll(jsonCopy(start));
      if (d.pointerCount >= 2) {
        final ratio = d.scale / _baseScale;
        final turn = (d.rotation - _baseRot) * 180 / math.pi;
        if (fill) {
          _apply(l, key, zoom: _round(lnum(picture['zoom'], 1) * ratio));
        } else {
          final turns = key == 'picture' || key.startsWith('sticker:');
          _apply(l, key, size: _round(geo.size * ratio), rotate: turns ? geo.rotate + turn : null);
        }
        return;
      }
      final pan = key == 'picture' && (fill || (_panMode && !drawn));
      if (pan) {
        final boxW = fill ? w : w * geo.size / 100;
        final boxH = fill ? h : boxW;
        _apply(l, key,
            panX: _round(lnum(picture['panX']) + 2 * delta.dx / boxW * 100), panY: _round(lnum(picture['panY']) + 2 * delta.dy / boxH * 100));
        return;
      }
      var x = _round(_clamp(geo.x + delta.dx / w * 100, -20, 120));
      var y = _round(_clamp(geo.y + delta.dy / h * 100, -20, 120));
      v = (x - 50).abs() < _snap;
      hz = (y - 50).abs() < _snap;
      if (v) x = 50;
      if (hz) y = 50;
      _apply(l, key, x: x, y: y);
    }, history: false);
    if (v != _guideV || hz != _guideH) {
      setState(() {
        _guideV = v;
        _guideH = hz;
      });
    }
  }

  void _scaleEnd(ScaleEndDetails _) {
    _gKey = null;
    if (_guideV || _guideH) setState(() => _guideV = _guideH = false);
  }

  // Actions -------------------------------------------------------------------------------------------

  void _addSticker(String kind) {
    final l = draft.layoutOf(rank);
    if ((l['stickers'] as List? ?? const []).length >= maxStickers) return;
    final id = newStickerId();
    _setLayout((l) => (l['stickers'] as List).add(<String, dynamic>{
          'id': id, 'kind': kind, 'value': kind == 'emoji' ? '⭐' : 'Text', 'x': 50, 'y': 50,
          'size': kind == 'emoji' ? 16 : 10, 'rotate': 0, 'color': kind == 'emoji' ? '#000000' : draft.design['accent'] ?? '#b07a12',
        }));
    setState(() => _selected = 'sticker:$id');
  }

  void _removeSticker(String key) {
    _setLayout((l) => (l['stickers'] as List).removeWhere((s) => 'sticker:${(s as Map)['id']}' == key));
    setState(() => _selected = null);
  }

  void _reorder(String key, int dir) => _setLayout((l) {
        final list = l['stickers'] as List;
        final i = list.indexWhere((s) => 'sticker:${(s as Map)['id']}' == key);
        final j = (i + dir).clamp(0, list.length - 1);
        if (i < 0 || i == j) return;
        final t = list[i];
        list[i] = list[j];
        list[j] = t;
      });

  void _updateSticker(String key, String field, Object value, {bool coalesce = true}) => _setLayout((l) {
        for (final s in l['stickers'] as List) {
          if ('sticker:${(s as Map)['id']}' == key) s[field] = value;
        }
      }, key: coalesce ? 'sticker-$key-$field' : null);

  Future<void> _copyToAll() async {
    var withStickers = false;
    final go = await showModalBottomSheet<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, set) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('Layout auf alle Karten übertragen?', style: T.display(28)),
              const SizedBox(height: 6),
              Text('Position und Stil von Bild, Zahl und Name dieser Karte gelten dann für alle 13 Karten. Bilder, Namen und Grafiken der Karten bleiben erhalten.',
                  style: T.body(15, color: C.inkSoft)),
              SwitchRow(label: 'Sticker mitkopieren', value: withStickers, onChanged: (v) => set(() => withStickers = v)),
              const SizedBox(height: 10),
              GoldButton(label: 'Übertragen', jicon: 'cards', onPressed: () => Navigator.pop(ctx, true)),
              const SizedBox(height: 8),
              SoftButton(label: 'Abbrechen', onPressed: () => Navigator.pop(ctx, false)),
            ]),
          ),
        ),
      ),
    );
    if (go != true) return;
    final source = draft.layoutOf(rank);
    final deck = draft.deck;
    draft.change((d) {
      final cards = d['cards'] as List;
      for (var r = 1; r <= cards.length; r++) {
        final c = cards[r - 1] as Map;
        final base = c['layout'] is Map ? lmap(c['layout']) : defaultLayout(deck, deck.face(r));
        c['layout'] = {
          ...jsonCopy(source),
          'stickers': withStickers
              ? [for (final s in source['stickers'] as List) {...Map<String, dynamic>.from(s as Map), 'id': newStickerId()}]
              : base['stickers'] ?? [],
        };
      }
    });
    if (mounted) toast(context, 'Layout auf alle 13 Karten übertragen.');
  }

  void _resetLayout() {
    draft.setCard(rank, 'layout', null);
    setState(() => _selected = null);
  }

  // Build ---------------------------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final deck = draft.deck;
    final face = deck.face(rank);
    final layout = draft.layoutOf(rank);
    final custom = draft.card(rank)['layout'] is Map;
    final stickers = (layout['stickers'] as List? ?? const []).map(lmap).toList();
    final full = stickers.length >= maxStickers;

    String chipLabel(String key) {
      if (key == 'picture') return lmap(layout['picture'])['visible'] == false ? 'Bild (aus)' : 'Bild';
      if (key == 'number') return lmap(layout['number'])['style'] == 'aus' ? 'Zahl (aus)' : 'Zahl';
      if (key == 'name') return lmap(layout['name'])['style'] == 'aus' ? 'Name (aus)' : 'Name';
      final s = _sticker(layout, key);
      final value = s?['value'] as String? ?? '';
      return value.length > 10 ? value.substring(0, 10) : value;
    }

    String chipIcon(String key) => switch (key) { 'picture' => 'image', 'number' => 'hash', 'name' => 'tag', _ => 'star' };
    final order = ['number', 'name', for (final s in stickers.reversed) 'sticker:${s['id']}', 'picture'];

    return Backdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          foregroundColor: C.ink,
          title: Text(rank == jester ? 'Narr gestalten' : 'Karte $rank gestalten', style: T.display(26)),
          actions: [
            IconButton(tooltip: 'Rückgängig', onPressed: draft.canUndo ? draft.undo : null, icon: JIcon('undo', color: draft.canUndo ? C.ink : C.inkMute)),
            IconButton(tooltip: 'Wiederholen', onPressed: draft.canRedo ? draft.redo : null, icon: JIcon('redo', color: draft.canRedo ? C.ink : C.inkMute)),
            const SizedBox(width: 6),
          ],
        ),
        // The canvas stays outside the scrolling inspector so drags on it never scroll the page.
        body: LayoutBuilder(builder: (context, box) {
          _canvasW = math.min(300, math.min(box.maxWidth * .7, box.maxHeight * .46 / 1.4)).floorToDouble();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                height: 44,
                margin: const EdgeInsets.symmetric(horizontal: 16),
                child: ListView(scrollDirection: Axis.horizontal, children: [
                  ToolButton(icon: 'star', label: 'Sticker', onTap: full ? null : () => _addSticker('emoji')),
                  const SizedBox(width: 8),
                  ToolButton(icon: 'pencil', label: 'Text', onTap: full ? null : () => _addSticker('text')),
                  const SizedBox(width: 8),
                  ToolButton(icon: 'cards', label: 'Auf alle Karten', onTap: _copyToAll),
                  if (custom) ...[const SizedBox(width: 8), ToolButton(icon: 'undo', label: 'Standard-Layout', onTap: _resetLayout)],
                ]),
              ),
              const SizedBox(height: 16),
              Center(child: _canvas(deck, face, layout)),
              const SizedBox(height: 14),
              SizedBox(
                height: 44,
                child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 16), children: [
                  for (final key in order) ...[
                    ToolButton(icon: chipIcon(key), label: chipLabel(key), active: _selected == key, onTap: () => setState(() => _selected = key)),
                    const SizedBox(width: 8),
                  ],
                  if (_selected != null) ToolButton(icon: 'close', label: 'Auswahl aufheben', onTap: () => setState(() => _selected = null)),
                ]),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.paddingOf(context).bottom + 28),
                  children: [_inspector(layout, face.image != null, face.image == null && face.art != null)],
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  Widget _canvas(Deck deck, CardFace face, Map<String, dynamic> layout) {
    final w = _canvasW;
    return Listener(
      onPointerDown: _pointerDown,
      onPointerUp: _pointerUp,
      onPointerCancel: _pointerUp,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => setState(() => _selected = _downTarget),
        onScaleStart: _scaleStart,
        onScaleUpdate: _scaleUpdate,
        onScaleEnd: _scaleEnd,
        child: Container(
          width: w, height: w * 1.4,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(w * .1),
            border: Border.all(color: hexColor(deck.frame), width: 3),
            boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 30, offset: Offset(0, 10))],
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(children: [
            LayoutFace(deck: deck, face: face, rank: rank, layout: layout, width: w - 6, wrap: _wrap),
            if (_guideV) Positioned(left: (w - 6) / 2, top: 0, bottom: 0, child: const ColoredBox(color: C.wax, child: SizedBox(width: 1))),
            if (_guideH) Positioned(top: (w - 6) * 1.4 / 2, left: 0, right: 0, child: const ColoredBox(color: C.wax, child: SizedBox(height: 1))),
          ]),
        ),
      ),
    );
  }

  Widget _inspector(Map<String, dynamic> layout, bool hasPhoto, bool drawn) {
    final sel = _selected;
    final accent = draft.design['accent'] as String? ?? '#b07a12';
    final paper = draft.design['paper'] as String? ?? '#fbf0d9';

    if (sel == 'picture') {
      final p = lmap(layout['picture']);
      final fill = p['fill'] == true;
      void set(String field, Object value, {bool push = false}) =>
          _setLayout((l) => (l['picture'] as Map)[field] = value, key: push ? null : 'picture-$field');
      return EditorGroup(title: 'Bild', children: [
        Wrap(spacing: 8, runSpacing: 8, children: [
          ToolButton(icon: 'camera', label: hasPhoto ? 'Foto ändern' : 'Foto', busy: widget.isUploading(rank), onTap: () => widget.onUploadPhoto(rank)),
          ToolButton(icon: 'palette', label: 'Grafik', onTap: () => widget.onPickArt(rank)),
        ]),
        SwitchRow(label: 'Ganze Karte füllen', hint: 'Das Bild bedeckt die komplette Vorderseite.', value: fill, onChanged: (v) => set('fill', v, push: true)),
        if (!fill) ...[
          ChoiceRow(label: 'Form', value: p['shape'] as String? ?? 'kreis', options: [for (final e in pictureShapeLabels.entries) (e.key, e.value)],
              onChanged: (v) => set('shape', v, push: true)),
          LabeledSlider(label: 'Größe', value: lnum(p['size'], 62), min: 10, max: 160, unit: ' %', onChanged: (v) => set('size', v.roundToDouble())),
          LabeledSlider(label: 'Drehung', value: lnum(p['rotate']), min: -180, max: 180, unit: '°', onChanged: (v) => set('rotate', v.roundToDouble())),
        ],
        if (hasPhoto || fill) ...[
          LabeledSlider(label: 'Zoom', value: lnum(p['zoom'], 1) * 100, min: 100, max: 500, unit: ' %', onChanged: (v) => set('zoom', (v / 100 * 100).round() / 100)),
          LabeledSlider(label: 'Ausschnitt waagerecht', value: lnum(p['panX']), min: -100, max: 100, onChanged: (v) => set('panX', v.roundToDouble())),
          LabeledSlider(label: 'Ausschnitt senkrecht', value: lnum(p['panY']), min: -100, max: 100, onChanged: (v) => set('panY', v.roundToDouble())),
          if (!fill && !drawn)
            SwitchRow(label: 'Ausschnitt mit dem Finger verschieben', hint: 'Ziehen verschiebt dann das Foto im Rahmen statt den Rahmen.',
                value: _panMode, onChanged: (v) => setState(() => _panMode = v)),
        ],
        SwitchRow(label: 'Bild anzeigen', value: p['visible'] != false, onChanged: (v) => set('visible', v, push: true)),
      ]);
    }

    if (sel == 'number') {
      final n = lmap(layout['number']);
      final style = n['style'] as String? ?? 'ecken';
      return EditorGroup(title: 'Zahl', children: [
        ChoiceRow(
          label: 'Darstellung',
          value: style,
          options: [for (final e in numberStyleLabels.entries) (e.key, e.value)],
          onChanged: (v) => _setLayout((l) {
            final m = l['number'] as Map..['style'] = v;
            if (v == 'gross') m.addAll(<String, dynamic>{'x': 50, 'y': 22, 'size': 40});
            if (v == 'ecken') m.addAll(<String, dynamic>{'x': 13, 'y': 9, 'size': 19});
          }),
        ),
        if (style != 'aus') ...[
          LabeledSlider(label: 'Größe', value: lnum(n['size'], 19), min: 6, max: 80, unit: ' %',
              onChanged: (v) => _setLayout((l) => (l['number'] as Map)['size'] = v.roundToDouble(), key: 'number-size')),
          ColorField(
            label: 'Farbe',
            value: n['color'] as String? ?? accent,
            onChanged: (c) => _setLayout((l) => (l['number'] as Map)['color'] = c, key: 'number-color'),
            onReset: n['color'] is String ? () => _setLayout((l) => (l['number'] as Map)['color'] = null) : null,
          ),
        ],
        if (style == 'ecken') Text('Die Zahl unten rechts spiegelt die obere automatisch.', style: T.body(14, color: C.inkSoft)),
        const SizedBox(height: 6),
      ]);
    }

    if (sel == 'name') {
      final n = lmap(layout['name']);
      final style = n['style'] as String? ?? 'band';
      return EditorGroup(title: 'Name', children: [
        DraftTextField(label: 'Text', value: draft.card(rank)['name'] as String? ?? '', maxLength: 24,
            onChanged: (v) => draft.setCard(rank, 'name', v, key: '$rank-name')),
        ChoiceRow(label: 'Stil', value: style, options: [for (final e in nameStyleLabels.entries) (e.key, e.value)],
            onChanged: (v) => _setLayout((l) => (l['name'] as Map)['style'] = v)),
        if (style != 'aus') ...[
          LabeledSlider(label: 'Schriftgröße', value: lnum(n['size'], 8.5), min: 3, max: 20, unit: ' %',
              onChanged: (v) => _setLayout((l) => (l['name'] as Map)['size'] = (v * 2).round() / 2, key: 'name-size')),
          LabeledSlider(label: 'Breite', value: lnum(n['width'], 92), min: 20, max: 100, unit: ' %',
              onChanged: (v) => _setLayout((l) => (l['name'] as Map)['width'] = v.roundToDouble(), key: 'name-width')),
        ],
      ]);
    }

    final sticker = _sticker(layout, sel);
    if (sel != null && sticker != null) {
      final emoji = sticker['kind'] == 'emoji';
      final stickers = layout['stickers'] as List;
      return EditorGroup(title: emoji ? 'Sticker' : 'Text', children: [
        if (emoji)
          SymbolField(label: 'Emoji', value: sticker['value'] as String? ?? '', maxLength: 24,
              onChanged: (v) => v.trim().isEmpty ? null : _updateSticker(sel, 'value', v))
        else
          DraftTextField(label: 'Text', value: sticker['value'] as String? ?? '', maxLength: 24,
              onChanged: (v) => v.trim().isEmpty ? null : _updateSticker(sel, 'value', v)),
        LabeledSlider(label: 'Größe', value: lnum(sticker['size'], 16), min: 3, max: 90, unit: ' %', onChanged: (v) => _updateSticker(sel, 'size', v.roundToDouble())),
        LabeledSlider(label: 'Drehung', value: lnum(sticker['rotate']), min: -180, max: 180, unit: '°', onChanged: (v) => _updateSticker(sel, 'rotate', v.roundToDouble())),
        if (!emoji) ColorField(label: 'Farbe', value: sticker['color'] as String? ?? '#000000', onChanged: (c) => _updateSticker(sel, 'color', c)),
        const SizedBox(height: 6),
        Wrap(spacing: 8, runSpacing: 8, children: [
          ToolButton(icon: 'redo', label: 'Nach vorne', onTap: () => _reorder(sel, 1)),
          ToolButton(icon: 'undo', label: 'Nach hinten', onTap: () => _reorder(sel, -1)),
          ToolButton(
            icon: 'plus',
            label: 'Duplizieren',
            onTap: stickers.length >= maxStickers
                ? null
                : () {
                    final id = newStickerId();
                    _setLayout((l) => (l['stickers'] as List).add(<String, dynamic>{
                          ...sticker, 'id': id, 'x': lnum(sticker['x'], 50) + 4, 'y': lnum(sticker['y'], 50) + 4,
                        }));
                    setState(() => _selected = 'sticker:$id');
                  },
          ),
          ToolButton(icon: 'close', label: 'Löschen', danger: true, onTap: () => _removeSticker(sel)),
        ]),
        const SizedBox(height: 8),
      ]);
    }

    return EditorGroup(
      title: rank == jester ? 'Narr' : 'Karte $rank',
      hint: 'Tippe ein Element auf der Karte oder unten bei den Ebenen an. Ziehen verschiebt, mit zwei Fingern zoomst und drehst du.',
      children: [
        ColorField(
          label: 'Hintergrund',
          value: layout['background'] as String? ?? paper,
          onChanged: (c) => _setLayout((l) => l['background'] = c, key: 'background'),
          onReset: layout['background'] is String ? () => _setLayout((l) => l['background'] = null) : null,
        ),
        SwitchRow(label: 'Zierrahmen', hint: 'Goldene Innenlinie mit Eck-Rauten.', value: layout['frame'] != false,
            onChanged: (v) => _setLayout((l) => l['frame'] = v)),
        const SizedBox(height: 6),
        Wrap(spacing: 8, runSpacing: 8, children: [
          ToolButton(icon: 'image', label: 'Bild', onTap: () => setState(() => _selected = 'picture')),
          ToolButton(icon: 'hash', label: 'Zahl', onTap: () => setState(() => _selected = 'number')),
          ToolButton(icon: 'tag', label: 'Name', onTap: () => setState(() => _selected = 'name')),
        ]),
        const SizedBox(height: 8),
      ],
    );
  }
}
