import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../api.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import 'court_models.dart';
import 'crest.dart';

/// A filled wax-red button for destructive confirmations.
class _DangerButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  const _DangerButton({required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) => SizedBox(
        height: 52,
        child: FilledButton(
          onPressed: () {
            HapticFeedback.mediumImpact();
            onPressed();
          },
          style: FilledButton.styleFrom(
            backgroundColor: C.wax,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 18),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          ),
          child: Text(label, overflow: TextOverflow.ellipsis, style: T.body(16, color: Colors.white, weight: FontWeight.w800)),
        ),
      );
}

/// Asks before a destructive step; resolves to true only on an explicit confirm.
Future<bool> confirmDanger(BuildContext context, {required String title, required String message, required String confirm, String cancel = 'Abbrechen'}) async {
  final yes = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title, style: T.display(28)),
      content: Text(message, style: T.body(16, color: C.inkSoft, height: 1.35)),
      actionsPadding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      actions: [
        Row(children: [
          Expanded(child: SoftButton(label: cancel, onPressed: () => Navigator.pop(ctx, false))),
          const SizedBox(width: 10),
          Expanded(child: _DangerButton(label: confirm, onPressed: () => Navigator.pop(ctx, true))),
        ]),
      ],
    ),
  );
  return yes == true;
}

/// Owner only: rename the court and pick a new crest. Resolves to true when saved.
Future<bool> showEditCourtSheet(BuildContext context, CourtDetail court) async {
  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (_) => _EditCourtSheet(court: court),
  );
  return saved == true;
}

class _EditCourtSheet extends StatefulWidget {
  final CourtDetail court;
  const _EditCourtSheet({required this.court});

  @override
  State<_EditCourtSheet> createState() => _EditCourtSheetState();
}

class _EditCourtSheetState extends State<_EditCourtSheet> {
  late final _name = TextEditingController(text: widget.court.name);
  late String _crest = widget.court.crest;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || _name.text.trim().length < 2) return;
    setState(() => _busy = true);
    final res = await Api.post('court', {'op': 'update', 'id': widget.court.id, 'name': _name.text.trim(), 'crest': _crest});
    if (!mounted) return;
    setState(() => _busy = false);
    if (!res.ok) return toast(context, res.error!, error: true);
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.viewInsetsOf(context).bottom + MediaQuery.paddingOf(context).bottom + 22),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Hof bearbeiten', style: T.display(30)),
          const SizedBox(height: 16),
          Row(children: [
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              transitionBuilder: (child, a) => ScaleTransition(scale: a, child: FadeTransition(opacity: a, child: child)),
              child: Crest(key: ValueKey(_crest), id: _crest, size: 60),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: TextField(
                controller: _name,
                maxLength: 40,
                textCapitalization: TextCapitalization.sentences,
                style: T.body(17),
                decoration: const InputDecoration(labelText: 'Name', counterText: ''),
                onChanged: (_) => setState(() {}),
                onSubmitted: (_) => _save(),
              ),
            ),
          ]),
          const SizedBox(height: 16),
          Text('Wappen', style: T.label(15)),
          const SizedBox(height: 8),
          CrestPicker(crests: widget.court.crests, value: _crest, onChanged: (id) => setState(() => _crest = id)),
          const SizedBox(height: 18),
          GoldButton(label: 'Speichern', icon: Icons.check_rounded, busy: _busy, onPressed: _name.text.trim().length >= 2 ? _save : null),
        ]),
      ),
    );
  }
}
