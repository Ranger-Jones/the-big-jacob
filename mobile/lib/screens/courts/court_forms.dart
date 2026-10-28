import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../api.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import 'crest.dart';

/// Keeps invite codes to letters and digits, in uppercase.
class _CodeFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = newValue.text.toUpperCase().replaceAll(RegExp('[^A-Z0-9]'), '');
    final cut = text.length > 8 ? text.substring(0, 8) : text;
    return TextEditingValue(text: cut, selection: TextSelection.collapsed(offset: cut.length));
  }
}

/// The large, clearly readable code style (sans, tracked) shared by the field and the invite card.
TextStyle codeStyle(double size) =>
    T.body(size, color: C.goldSoft, weight: FontWeight.w800).copyWith(letterSpacing: size * .22, fontFeatures: const [FontFeature.tabularFigures()]);

/// "Hof beitreten": an 8 character code, then join.
class JoinCourtPanel extends StatefulWidget {
  final String initialCode;
  final ValueChanged<String> onJoined;
  const JoinCourtPanel({super.key, this.initialCode = '', required this.onJoined});

  @override
  State<JoinCourtPanel> createState() => _JoinCourtPanelState();
}

class _JoinCourtPanelState extends State<JoinCourtPanel> {
  late final _code = TextEditingController(text: _CodeFormatter().formatEditUpdate(TextEditingValue.empty, TextEditingValue(text: widget.initialCode)).text);
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    if (_busy || _code.text.length != 8) return;
    FocusScope.of(context).unfocus();
    setState(() => _busy = true);
    final res = await Api.post('court', {'op': 'join', 'code': _code.text});
    if (!mounted) return;
    setState(() => _busy = false);
    if (!res.ok) return toast(context, res.error!, error: true);
    _code.clear();
    widget.onJoined((res.data as Map)['id'] as String);
  }

  @override
  Widget build(BuildContext context) {
    return Panel(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Hof beitreten', style: T.display(30)),
        const SizedBox(height: 4),
        Text('Den Einladungscode bekommst du von jemandem am Hof.', style: T.body(15, color: C.inkSoft)),
        const SizedBox(height: 14),
        TextField(
          controller: _code,
          textCapitalization: TextCapitalization.characters,
          autocorrect: false,
          enableSuggestions: false,
          textAlign: TextAlign.center,
          inputFormatters: [_CodeFormatter()],
          style: codeStyle(26),
          decoration: const InputDecoration(labelText: 'Einladungscode', hintText: 'z. B. K7QM2XPA', floatingLabelAlignment: FloatingLabelAlignment.center),
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => _join(),
        ),
        const SizedBox(height: 14),
        GoldButton(
          label: 'Beitreten',
          icon: Icons.login_rounded,
          busy: _busy,
          onPressed: _code.text.length == 8 ? _join : null,
        ),
      ]),
    );
  }
}

/// "Neuen Hof gründen": a name and a crest, then create.
class CreateCourtPanel extends StatefulWidget {
  final List<String> crests;
  final bool first;
  final ValueChanged<String> onCreated;
  const CreateCourtPanel({super.key, required this.crests, required this.first, required this.onCreated});

  @override
  State<CreateCourtPanel> createState() => _CreateCourtPanelState();
}

class _CreateCourtPanelState extends State<CreateCourtPanel> {
  final _name = TextEditingController();
  String? _crest;
  bool _busy = false;

  String? get _chosen => _crest ?? (widget.crests.isEmpty ? null : widget.crests.first);

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final crest = _chosen;
    if (_busy || crest == null || _name.text.trim().length < 2) return;
    FocusScope.of(context).unfocus();
    setState(() => _busy = true);
    final res = await Api.post('court', {'op': 'create', 'name': _name.text.trim(), 'crest': crest});
    if (!mounted) return;
    setState(() => _busy = false);
    if (!res.ok) return toast(context, res.error!, error: true);
    toast(context, 'Hof gegründet. Teile jetzt den Einladungscode.');
    _name.clear();
    setState(() => _crest = null);
    widget.onCreated((res.data as Map)['id'] as String);
  }

  @override
  Widget build(BuildContext context) {
    final crest = _chosen;
    return Panel(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(widget.first ? 'Deinen ersten Hof gründen' : 'Neuen Hof gründen', style: T.display(30)),
        const SizedBox(height: 4),
        Text('Du wirst Hofherr und kannst danach alle einladen.', style: T.body(15, color: C.inkSoft)),
        const SizedBox(height: 16),
        Row(children: [
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            transitionBuilder: (child, a) => ScaleTransition(scale: a, child: FadeTransition(opacity: a, child: child)),
            child: Crest(key: ValueKey(crest), id: crest ?? '', size: 60),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: TextField(
              controller: _name,
              maxLength: 40,
              textCapitalization: TextCapitalization.sentences,
              style: T.body(17),
              decoration: const InputDecoration(labelText: 'Name', hintText: 'z. B. Wache Süd', counterText: ''),
              onChanged: (_) => setState(() {}),
              onSubmitted: (_) => _create(),
            ),
          ),
        ]),
        const SizedBox(height: 16),
        Text('Wappen', style: T.label(15)),
        const SizedBox(height: 8),
        CrestPicker(crests: widget.crests, value: crest, onChanged: (id) => setState(() => _crest = id)),
        const SizedBox(height: 16),
        GoldButton(
          label: 'Hof gründen',
          icon: Icons.fort_rounded,
          busy: _busy,
          onPressed: _name.text.trim().length >= 2 && crest != null ? _create : null,
        ),
      ]),
    );
  }
}
