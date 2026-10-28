/// Friend codes: what the "Mein Code" QR carries and how a scanned value is read back.
library;

/// Website that a plain phone camera opens; the web friends page shows a confirm card for `?add=`.
const friendCodeHost = 'the-big-jacob.vercel.app';

final _usernameRe = RegExp(r'^[A-Za-z0-9_]{3,20}$');

/// QR payload for [username]: `https://the-big-jacob.vercel.app/freunde?add=<username>`.
String friendCodeUrl(String username) => Uri.https(friendCodeHost, '/freunde', {'add': username}).toString();

/// Username from a scanned value: the friend URL (query parameter `add` on /freunde) or a plain
/// username. Returns null for anything else.
String? parseFriendCode(String? raw) {
  final value = raw?.trim() ?? '';
  if (value.isEmpty) return null;
  if (_usernameRe.hasMatch(value)) return value;
  final uri = Uri.tryParse(value);
  if (uri == null || (uri.scheme != 'https' && uri.scheme != 'http')) return null;
  final path = uri.path.endsWith('/') ? uri.path.substring(0, uri.path.length - 1) : uri.path;
  if (path != '/freunde') return null;
  final add = uri.queryParameters['add']?.trim();
  return add != null && _usernameRe.hasMatch(add) ? add : null;
}
