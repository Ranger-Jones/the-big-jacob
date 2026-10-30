import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../api.dart';
import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// Same rule as the server (src/lib/username.ts).
final usernamePattern = RegExp(r'^[A-Za-z0-9_]{3,20}$');

/// German like the server's messages; toast() translates it.
const uploadFailed = 'Das Bild konnte nicht hochgeladen werden. Versuch ein anderes.';

enum AvatarChoice { camera, gallery, remove }

/// Bottom sheet with the ways to change the own portrait.
Future<AvatarChoice?> showAvatarSheet(BuildContext context, {required bool hasAvatar}) {
  return showModalBottomSheet<AvatarChoice>(
    context: context,
    builder: (ctx) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(t('Profilbild'), style: T.display(30)),
          const SizedBox(height: 4),
          Text(t('So sieht dich der Hof an jedem Tisch.'), style: T.body(15, color: C.inkSoft)),
          const SizedBox(height: 16),
          _SheetItem(icon: Icons.photo_camera_rounded, label: t('Foto aufnehmen'), onTap: () => Navigator.pop(ctx, AvatarChoice.camera)),
          _SheetItem(icon: Icons.photo_library_rounded, label: t('Aus Fotos wählen'), onTap: () => Navigator.pop(ctx, AvatarChoice.gallery)),
          if (hasAvatar)
            _SheetItem(icon: Icons.delete_outline_rounded, label: t('Profilbild entfernen'), danger: true, onTap: () => Navigator.pop(ctx, AvatarChoice.remove)),
        ]),
      ),
    ),
  );
}

class _SheetItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;
  const _SheetItem({required this.icon, required this.label, required this.onTap, this.danger = false});

  @override
  Widget build(BuildContext context) {
    final color = danger ? C.wax : C.ink;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Panel(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        onTap: onTap,
        child: Row(children: [
          Container(
            width: 40, height: 40, alignment: Alignment.center,
            decoration: BoxDecoration(shape: BoxShape.circle, color: (danger ? C.wax : C.gold).withValues(alpha: .14)),
            child: Icon(icon, color: danger ? C.wax : C.goldSoft, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: T.body(17, color: color, weight: FontWeight.w700))),
        ]),
      ),
    );
  }
}

/// Outcome of picking and uploading a new portrait.
sealed class AvatarUpload {
  const AvatarUpload();
}

class AvatarCancelled extends AvatarUpload {
  const AvatarCancelled();
}

class AvatarDone extends AvatarUpload {
  const AvatarDone();
}

class AvatarFailed extends AvatarUpload {
  final String message;
  const AvatarFailed(this.message);
}

/// Picks a small image and stores it in the user's own avatars folder.
/// [onPicked] fires once an image was chosen, so the caller can show its spinner only for the upload.
Future<AvatarUpload> pickAndUploadAvatar(ImageSource source, {VoidCallback? onPicked}) async {
  final supabase = Supabase.instance.client;
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return const AvatarFailed(uploadFailed);

  final XFile? file;
  try {
    file = await ImagePicker().pickImage(source: source, maxWidth: 256, maxHeight: 256, imageQuality: 82);
  } on PlatformException catch (e) {
    if (e.code.contains('access_denied')) {
      return AvatarFailed(source == ImageSource.camera
          ? t('Kein Zugriff auf die Kamera. Bitte in den Einstellungen erlauben.')
          : t('Kein Zugriff auf deine Fotos. Bitte in den Einstellungen erlauben.'));
    }
    return const AvatarFailed(uploadFailed);
  } catch (_) {
    return const AvatarFailed(uploadFailed);
  }
  if (file == null) return const AvatarCancelled();
  onPicked?.call();

  try {
    final bytes = await file.readAsBytes();
    if (bytes.isEmpty) return const AvatarFailed(uploadFailed);
    // imageQuality re-encodes as JPEG; a PNG that the platform left alone is labelled as such.
    final png = bytes.length > 4 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
    final path = '$userId/avatar-${DateTime.now().millisecondsSinceEpoch}.${png ? 'png' : 'jpg'}';
    final bucket = supabase.storage.from('avatars');
    await bucket.uploadBinary(path, bytes, fileOptions: FileOptions(contentType: png ? 'image/png' : 'image/jpeg'));
    final res = await Api.post('profile', {'op': 'avatar', 'url': bucket.getPublicUrl(path)});
    return res.ok ? const AvatarDone() : const AvatarFailed(uploadFailed);
  } catch (_) {
    return const AvatarFailed(uploadFailed);
  }
}

/// Sheet to choose a new username. Saves it itself and returns the new name on success.
Future<String?> showRenameSheet(BuildContext context, {required String current}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    builder: (_) => _RenameSheet(current: current),
  );
}

class _RenameSheet extends StatefulWidget {
  final String current;
  const _RenameSheet({required this.current});

  @override
  State<_RenameSheet> createState() => _RenameSheetState();
}

class _RenameSheetState extends State<_RenameSheet> {
  late final _controller = TextEditingController(text: widget.current);
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String get _value => _controller.text.trim();
  bool get _valid => usernamePattern.hasMatch(_value) && _value != widget.current;

  Future<void> _save() async {
    if (!_valid || _busy) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    final name = _value;
    final res = await Api.post('profile', {'op': 'rename', 'username': name});
    if (!mounted) return;
    if (res.ok) return Navigator.pop(context, name);
    setState(() {
      _busy = false;
      _error = res.error;
    });
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    final value = _value;
    final hint = value.isNotEmpty && !usernamePattern.hasMatch(value) ? t('3–20 Zeichen, nur Buchstaben, Zahlen und _.') : null;
    return Padding(
      padding: EdgeInsets.only(bottom: inset),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(t('Benutzername ändern'), style: T.display(30)),
            const SizedBox(height: 4),
            Text(t('Unter diesem Namen kennt dich der Hof. Deine Spiele und Abzeichen bleiben erhalten.'), style: T.body(15, color: C.inkSoft)),
            const SizedBox(height: 18),
            TextField(
              controller: _controller,
              autofocus: true,
              enabled: !_busy,
              autocorrect: false,
              enableSuggestions: false,
              maxLength: 20,
              textInputAction: TextInputAction.done,
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9_]'))],
              style: T.body(18, weight: FontWeight.w700),
              decoration: InputDecoration(
                labelText: t('Benutzername'),
                prefixIcon: const Icon(Icons.alternate_email_rounded, color: C.inkMute),
                errorText: _error ?? hint,
                counterStyle: T.label(12, color: C.inkMute),
              ),
              onChanged: (_) => setState(() => _error = null),
              onSubmitted: (_) => _save(),
            ),
            const SizedBox(height: 12),
            GoldButton(label: t('Speichern'), icon: Icons.check_rounded, busy: _busy, onPressed: _valid ? _save : null),
          ]),
        ),
      ),
    );
  }
}
