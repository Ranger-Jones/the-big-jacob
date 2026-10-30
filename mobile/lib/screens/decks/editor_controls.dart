import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:image_picker/image_picker.dart';

import '../../api.dart';
import '../../game/controller.dart' show allowedEmojis;
import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/jakob_icons.dart';
import '../../widgets/playing_card.dart' show hexColor;

/// Building blocks of the deck editor: big touch targets, swatches and segmented choices.

String hexOf(Color c) {
  String two(double v) => (v * 255).round().clamp(0, 255).toRadixString(16).padLeft(2, '0');
  return '#${two(c.r)}${two(c.g)}${two(c.b)}';
}

/// A titled group of controls on a velvet panel.
class EditorGroup extends StatelessWidget {
  final String title;
  final String? hint;
  final List<Widget> children;
  const EditorGroup({super.key, required this.title, this.hint, required this.children});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Panel(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(title, style: T.display(24)),
            if (hint != null) ...[const SizedBox(height: 4), Text(hint!, style: T.body(14, color: C.inkSoft))],
            const SizedBox(height: 8),
            ...children,
          ]),
        ),
      );
}

/// Segmented choice as a wrap of pills (works for 2–6 options on a phone).
class ChoiceRow<V> extends StatelessWidget {
  final String? label;
  final V value;
  final List<(V, String)> options;
  final ValueChanged<V> onChanged;
  const ChoiceRow({super.key, this.label, required this.value, required this.options, required this.onChanged});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (label != null) ...[Text(label!, style: T.label(14)), const SizedBox(height: 6)],
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final (v, text) in options)
              _Pill(
                text: text,
                selected: v == value,
                onTap: () {
                  if (v == value) return;
                  HapticFeedback.selectionClick();
                  onChanged(v);
                },
              ),
          ]),
        ]),
      );
}

class _Pill extends StatelessWidget {
  final String text;
  final bool selected;
  final VoidCallback onTap;
  const _Pill({required this.text, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selected,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(99),
            onTap: onTap,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              // No alignment here: inside a Wrap it would stretch the pill to the full row.
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(99),
                color: selected ? C.gold : C.velvet,
                border: Border.all(color: selected ? C.gold : C.line),
              ),
              child: Text(text, style: T.body(15.5, color: selected ? C.onGold : C.ink, weight: FontWeight.w700)),
            ),
          ),
        ),
      );
}

/// Label, value and a slider. Repeated changes are coalesced into one undo step by the caller's key.
class LabeledSlider extends StatelessWidget {
  final String label;
  final double value, min, max;
  final String unit;
  final ValueChanged<double> onChanged;
  const LabeledSlider({super.key, required this.label, required this.value, required this.min, required this.max, required this.onChanged, this.unit = ''});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(child: Text(label, style: T.label(14))),
            Text('${value.round()}$unit', style: T.label(14, color: C.inkMute)),
          ]),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: C.gold, inactiveTrackColor: C.surfaceHi, thumbColor: C.goldSoft, overlayColor: C.gold.withValues(alpha: .15),
              trackHeight: 5,
            ),
            child: Slider(value: value.clamp(min, max), min: min, max: max, onChanged: onChanged),
          ),
        ]),
      );
}

class SwitchRow extends StatelessWidget {
  final String label;
  final String? hint;
  final bool value;
  final ValueChanged<bool> onChanged;
  const SwitchRow({super.key, required this.label, this.hint, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) => InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => onChanged(!value),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label, style: T.body(16, weight: FontWeight.w700)),
                if (hint != null) Text(hint!, style: T.body(13.5, color: C.inkSoft)),
              ]),
            ),
            Switch(value: value, onChanged: onChanged),
          ]),
        ),
      );
}

/// Medium secondary button with a Hofstaat icon (44 pt high).
class ToolButton extends StatelessWidget {
  final String? label;
  final String icon;
  final VoidCallback? onTap;
  final bool busy, danger, active;
  final String? tooltip;
  const ToolButton({super.key, this.label, required this.icon, this.onTap, this.busy = false, this.danger = false, this.active = false, this.tooltip});

  @override
  Widget build(BuildContext context) {
    final color = danger ? C.wax : active ? C.onGold : C.ink;
    final button = Opacity(
      opacity: onTap == null ? .45 : 1,
      child: Material(
        color: active ? C.gold : C.surfaceHi,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: active ? C.gold : C.line)),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap == null || busy
              ? null
              : () {
                  HapticFeedback.selectionClick();
                  onTap!();
                },
          child: Container(
            constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
            padding: EdgeInsets.symmetric(horizontal: label == null ? 10 : 14),
            child: Row(mainAxisSize: MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.center, children: [
              if (busy)
                const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: C.gold))
              else
                JIcon(icon, size: 20, color: color),
              if (label != null) ...[
                const SizedBox(width: 8),
                Flexible(child: Text(label!, overflow: TextOverflow.ellipsis, style: T.body(15, color: color, weight: FontWeight.w700))),
              ],
            ]),
          ),
        ),
      ),
    );
    return tooltip == null ? button : Tooltip(message: tooltip!, child: button);
  }
}

/// A colour row: label, hex and a large swatch; tapping opens the colour sheet.
class ColorField extends StatelessWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final VoidCallback? onReset;
  const ColorField({super.key, required this.label, required this.value, required this.onChanged, this.onReset});

  @override
  Widget build(BuildContext context) => InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => showColorSheet(context, title: label, initial: value, onChanged: onChanged),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(children: [
            Expanded(child: Text(label, style: T.body(16, weight: FontWeight.w700))),
            if (onReset != null)
              TextButton(onPressed: onReset, child: Text(t('Standard'), style: T.label(14, color: C.goldSoft))),
            Text(value.toUpperCase(), style: T.label(13, color: C.inkMute)),
            const SizedBox(width: 10),
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: hexColor(value),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: .7), width: 2),
                boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 6, offset: Offset(0, 2))],
              ),
            ),
          ]),
        ),
      );
}

const _palette = [
  '#6b1e2e', '#8e2f40', '#c8323c', '#ef5a62', '#e07a3f', '#c98a1b', '#b07a12', '#e8b33a', '#f4b73a', '#ffd77a',
  '#2f7a4f', '#4e9a6a', '#3fbf7f', '#1e5a3d', '#1f4fb4', '#5b8def', '#2e2a5e', '#3d3878', '#17143a', '#1e2a3a',
  '#5a3418', '#7a4a24', '#4a3b2a', '#2b1a12', '#3f4a5e', '#56627a', '#000000', '#ffffff', '#fbf0d9', '#f4f1df',
  '#efe2c4', '#fdfdf7', '#eef0fb', '#f2efe6', '#2a2230', '#9a7b3c',
];

/// Colour sheet: palette swatches plus hue/saturation/brightness sliders. Changes apply live.
Future<void> showColorSheet(BuildContext context, {required String title, required String initial, required ValueChanged<String> onChanged}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      barrierColor: Colors.black26,
      builder: (_) => _ColorSheet(title: title, initial: initial, onChanged: onChanged),
    );

class _ColorSheet extends StatefulWidget {
  final String title, initial;
  final ValueChanged<String> onChanged;
  const _ColorSheet({required this.title, required this.initial, required this.onChanged});

  @override
  State<_ColorSheet> createState() => _ColorSheetState();
}

class _ColorSheetState extends State<_ColorSheet> {
  late HSVColor _hsv = HSVColor.fromColor(hexColor(widget.initial));

  String get _hex => hexOf(_hsv.toColor());

  void _set(HSVColor hsv) {
    setState(() => _hsv = hsv);
    widget.onChanged(_hex);
  }

  @override
  Widget build(BuildContext context) {
    Widget slider(String label, double value, double max, List<Color> track, ValueChanged<double> onChanged) => Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(label, style: T.label(14)),
            const SizedBox(height: 6),
            SizedBox(
              height: 36,
              child: Stack(alignment: Alignment.center, children: [
                Container(height: 14, decoration: BoxDecoration(borderRadius: BorderRadius.circular(99), gradient: LinearGradient(colors: track))),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: Colors.transparent, inactiveTrackColor: Colors.transparent, thumbColor: Colors.white,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 13), overlayColor: Colors.white24, trackHeight: 14,
                  ),
                  child: Slider(value: value, max: max, onChanged: onChanged),
                ),
              ]),
            ),
          ]),
        );
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(child: Text(widget.title, style: T.display(28))),
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(color: _hsv.toColor(), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white, width: 2)),
            ),
          ]),
          const SizedBox(height: 4),
          Text(_hex.toUpperCase(), style: T.label(14, color: C.inkMute)),
          const SizedBox(height: 12),
          // Two scrolling rows keep the sheet low, so the card preview above stays visible.
          SizedBox(
            height: 96,
            child: GridView.count(
              crossAxisCount: 2,
              scrollDirection: Axis.horizontal,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              children: [
                for (final hex in _palette)
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      _set(HSVColor.fromColor(hexColor(hex)));
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: hexColor(hex),
                        shape: BoxShape.circle,
                        border: Border.all(color: _hex == hex ? C.gold : Colors.white24, width: _hex == hex ? 3 : 1.5),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          slider(t('Farbton'), _hsv.hue, 360, [for (var h = 0; h <= 360; h += 60) HSVColor.fromAHSV(1, h.toDouble(), 1, 1).toColor()],
              (v) => _set(_hsv.withHue(v))),
          slider(t('Sättigung'), _hsv.saturation, 1, [_hsv.withSaturation(0).toColor(), _hsv.withSaturation(1).toColor()],
              (v) => _set(_hsv.withSaturation(v))),
          slider(t('Helligkeit'), _hsv.value, 1, [Colors.black, _hsv.withValue(1).toColor()], (v) => _set(_hsv.withValue(v))),
          const SizedBox(height: 14),
          GoldButton(label: t('Fertig'), jicon: 'check', onPressed: () => Navigator.pop(context)),
        ]),
      ),
    );
  }
}

/// A labelled text field that follows outside changes (undo, another card) without losing the cursor.
class DraftTextField extends StatefulWidget {
  final String label;
  final String value;
  final int maxLength;
  final ValueChanged<String> onChanged;
  const DraftTextField({super.key, required this.label, required this.value, required this.maxLength, required this.onChanged});

  @override
  State<DraftTextField> createState() => _DraftTextFieldState();
}

class _DraftTextFieldState extends State<DraftTextField> {
  late final _controller = TextEditingController(text: widget.value);

  @override
  void didUpdateWidget(DraftTextField old) {
    super.didUpdateWidget(old);
    if (widget.value != _controller.text) _controller.text = widget.value;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: TextField(
          controller: _controller,
          textCapitalization: TextCapitalization.sentences,
          inputFormatters: [LengthLimitingTextInputFormatter(widget.maxLength)],
          style: T.body(17, weight: FontWeight.w700),
          decoration: InputDecoration(labelText: widget.label),
          onChanged: widget.onChanged,
          onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
        ),
      );
}

/// A short symbol (emoji or up to 8 characters) with a row of quick picks.
class SymbolField extends StatefulWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final int maxLength;
  const SymbolField({super.key, required this.label, required this.value, required this.onChanged, this.maxLength = 8});

  @override
  State<SymbolField> createState() => _SymbolFieldState();
}

class _SymbolFieldState extends State<SymbolField> {
  late final _controller = TextEditingController(text: widget.value);

  @override
  void didUpdateWidget(SymbolField old) {
    super.didUpdateWidget(old);
    if (widget.value != _controller.text) _controller.text = widget.value;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(child: Text(widget.label, style: T.body(16, weight: FontWeight.w700))),
            SizedBox(
              width: 96,
              child: TextField(
                controller: _controller,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24),
                inputFormatters: [LengthLimitingTextInputFormatter(widget.maxLength)],
                decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(vertical: 10)),
                onChanged: widget.onChanged,
                onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
              ),
            ),
          ]),
          const SizedBox(height: 8),
          SizedBox(
            height: 44,
            child: ListView(scrollDirection: Axis.horizontal, children: [
              for (final e in allowedEmojis)
                InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () {
                    HapticFeedback.selectionClick();
                    _controller.text = e;
                    widget.onChanged(e);
                  },
                  child: Container(
                    width: 44, alignment: Alignment.center,
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(10), color: widget.value == e ? C.gold.withValues(alpha: .3) : null),
                    child: Text(e, style: const TextStyle(fontSize: 24)),
                  ),
                ),
            ]),
          ),
        ]),
      );
}

/// A drawn illustration group as sent by GET decks (`art`).
class ArtGroup {
  final String label;
  final List<String> ids;
  const ArtGroup(this.label, this.ids);

  static List<ArtGroup> parse(Object? raw) => [
        for (final g in (raw as List? ?? const []).whereType<Map>())
          ArtGroup(g['label'] as String? ?? '', [for (final id in (g['ids'] as List? ?? const [])) id as String]),
      ];
}

/// Picks one of the built-in illustrations. Resolves to its id, or null.
Future<String?> showArtPicker(BuildContext context, {required String title, required List<ArtGroup> groups}) =>
    showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: .8,
        maxChildSize: .95,
        builder: (ctx, scroll) => ListView(
          controller: scroll,
          padding: EdgeInsets.fromLTRB(18, 0, 18, MediaQuery.paddingOf(ctx).bottom + 20),
          children: [
            Text(title, style: T.display(28)),
            if (groups.isEmpty) EmptyNote(t('Die Grafiken konnten nicht geladen werden.')),
            for (final g in groups) ...[
              Padding(padding: const EdgeInsets.only(top: 16, bottom: 8), child: Text(t(g.label), style: T.display(22, color: C.goldSoft))),
              GridView.count(
                crossAxisCount: 5,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 6,
                crossAxisSpacing: 6,
                children: [
                  for (final id in g.ids)
                    Material(
                      color: C.velvet,
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => Navigator.pop(ctx, id),
                        child: Padding(padding: const EdgeInsets.all(5), child: SvgPicture.network(Api.artUrl(id, full: false))),
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );

sealed class PhotoPick {
  const PhotoPick();
}

class PhotoCancelled extends PhotoPick {
  const PhotoCancelled();
}

class PhotoBytes extends PhotoPick {
  final Uint8List bytes;
  const PhotoBytes(this.bytes);
}

class PhotoFailed extends PhotoPick {
  final String message;
  const PhotoFailed(this.message);
}

/// Asks camera or library, then picks a compressed photo: 5:7 for backs and full-card fronts, square for medallions.
Future<PhotoPick> pickDeckPhoto(BuildContext context, {required bool tall}) async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    builder: (ctx) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(t('Foto einsetzen'), style: T.display(30)),
          const SizedBox(height: 14),
          ToolButton(icon: 'camera', label: t('Foto aufnehmen'), onTap: () => Navigator.pop(ctx, ImageSource.camera)),
          const SizedBox(height: 10),
          ToolButton(icon: 'image', label: t('Aus Fotos wählen'), onTap: () => Navigator.pop(ctx, ImageSource.gallery)),
        ]),
      ),
    ),
  );
  if (source == null) return const PhotoCancelled();
  try {
    final file = await ImagePicker().pickImage(
      source: source,
      maxWidth: tall ? 500 : 384,
      maxHeight: tall ? 700 : 384,
      imageQuality: 82,
    );
    if (file == null) return const PhotoCancelled();
    final bytes = await file.readAsBytes();
    return bytes.isEmpty ? PhotoFailed(t('Das Bild konnte nicht gelesen werden.')) : PhotoBytes(bytes);
  } on PlatformException catch (e) {
    if (e.code.contains('access_denied')) {
      return PhotoFailed(source == ImageSource.camera
          ? t('Kein Zugriff auf die Kamera. Bitte in den Einstellungen erlauben.')
          : t('Kein Zugriff auf deine Fotos. Bitte in den Einstellungen erlauben.'));
    }
    return PhotoFailed(t('Das Bild konnte nicht gelesen werden.'));
  } catch (_) {
    return PhotoFailed(t('Das Bild konnte nicht gelesen werden.'));
  }
}

/// Asks before something is lost. Resolves to true on confirm.
Future<bool> confirmSheet(BuildContext context, {required String title, required String text, required String confirm, bool danger = true}) async =>
    await showModalBottomSheet<bool>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(title, style: T.display(30)),
            const SizedBox(height: 6),
            Text(text, style: T.body(16, color: C.inkSoft)),
            const SizedBox(height: 18),
            SoftButton(label: confirm, jicon: danger ? 'close' : 'check', danger: danger, onPressed: () => Navigator.pop(ctx, true)),
            const SizedBox(height: 10),
            GoldButton(label: t('Abbrechen'), onPressed: () => Navigator.pop(ctx, false)),
          ]),
        ),
      ),
    ) ==
    true;

/// Sheet with one text field (deck name). Resolves to the trimmed text, or null.
Future<String?> showNameSheet(BuildContext context, {required String title, required String initial, String? action}) =>
    showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _NameSheet(title: title, initial: initial, action: action ?? t('Übernehmen')),
    );

class _NameSheet extends StatefulWidget {
  final String title, initial, action;
  const _NameSheet({required this.title, required this.initial, required this.action});

  @override
  State<_NameSheet> createState() => _NameSheetState();
}

class _NameSheetState extends State<_NameSheet> {
  late final _controller = TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String get _value => _controller.text.trim();
  bool get _valid => _value.isNotEmpty && _value.length <= 40;

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text(widget.title, style: T.display(30)),
              const SizedBox(height: 16),
              TextField(
                controller: _controller,
                autofocus: true,
                maxLength: 40,
                textCapitalization: TextCapitalization.sentences,
                textInputAction: TextInputAction.done,
                style: T.body(18, weight: FontWeight.w700),
                decoration: InputDecoration(labelText: t('Name des Decks'), counterStyle: T.label(12, color: C.inkMute)),
                onChanged: (_) => setState(() {}),
                onSubmitted: (_) => _valid ? Navigator.pop(context, _value) : null,
              ),
              const SizedBox(height: 12),
              GoldButton(label: widget.action, jicon: 'check', onPressed: _valid ? () => Navigator.pop(context, _value) : null),
            ]),
          ),
        ),
      );
}
