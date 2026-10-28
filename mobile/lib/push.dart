import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';

/// Where a notification tap should lead, parsed from the push's deep link (same links as the web).
sealed class PushTarget {
  const PushTarget();

  static PushTarget parse(String url) {
    final path = Uri.tryParse(url)?.path ?? '/';
    final game = RegExp(r'^/spiel/([A-Za-z0-9]{3,12})/?$').firstMatch(path);
    if (game != null) return GameTarget(game.group(1)!.toUpperCase());
    if (path == '/freunde' || path.startsWith('/freunde/')) return const FriendsTarget();
    final profile = RegExp(r'^/profil/([A-Za-z0-9_]{3,20})/?$').firstMatch(path);
    if (profile != null) return ProfileTarget(profile.group(1)!);
    return const HomeTarget();
  }
}

class GameTarget extends PushTarget {
  final String code;
  const GameTarget(this.code);
  @override
  bool operator ==(Object other) => other is GameTarget && other.code == code;
  @override
  int get hashCode => code.hashCode;
}

class FriendsTarget extends PushTarget {
  const FriendsTarget();
}

class ProfileTarget extends PushTarget {
  final String username;
  const ProfileTarget(this.username);
  @override
  bool operator ==(Object other) => other is ProfileTarget && other.username == username;
  @override
  int get hashCode => username.hashCode;
}

class HomeTarget extends PushTarget {
  const HomeTarget();
}

/// Notification permission as iOS reports it.
enum PushStatus { unsupported, notDetermined, denied, authorized }

/// Native iOS push through the "jakob/push" channel in AppDelegate.swift (APNs, no Firebase).
class Push {
  static const _channel = MethodChannel('jakob/push');
  static const _tokenKey = 'push_token';
  static const _askedKey = 'push_asked';

  /// A tapped notification's deep link, until the shell consumes it.
  static final ValueNotifier<String?> opened = ValueNotifier(null);

  static bool get supported => !kIsWeb && Platform.isIOS;
  static bool _started = false;

  /// Listens for tokens and taps; picks up a tap that launched the app.
  static Future<void> start() async {
    if (!supported || _started) return;
    _started = true;
    _channel.setMethodCallHandler((call) async {
      final args = call.arguments is Map ? call.arguments as Map : const {};
      switch (call.method) {
        case 'token':
          await _sendToken(args['token'] as String?, args['environment'] as String?);
        case 'open':
          final url = args['url'];
          if (url is String) opened.value = url;
      }
    });
    try {
      final pending = await _channel.invokeMethod<String>('ready');
      if (pending != null) opened.value = pending;
    } on PlatformException catch (_) {
    } on MissingPluginException catch (_) {}
  }

  static Future<PushStatus> status() async {
    if (!supported) return PushStatus.unsupported;
    try {
      return switch (await _channel.invokeMethod<String>('status')) {
        'authorized' || 'provisional' || 'ephemeral' => PushStatus.authorized,
        'denied' => PushStatus.denied,
        _ => PushStatus.notDetermined,
      };
    } on MissingPluginException catch (_) {
      return PushStatus.unsupported;
    }
  }

  /// Asks iOS for permission (only shows a dialog the first time) and registers with APNs.
  static Future<bool> enable() async {
    if (!supported) return false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_askedKey, true);
    try {
      return await _channel.invokeMethod<bool>('request') ?? false;
    } on MissingPluginException catch (_) {
      return false;
    }
  }

  /// After sign-in: refreshes the token with the server if notifications are allowed (tokens can change).
  static Future<void> sync() async {
    if (!supported) return;
    try {
      await _channel.invokeMethod<bool>('register');
    } on MissingPluginException catch (_) {}
  }

  /// Whether to offer the short explanation once after sign-in.
  static Future<bool> shouldAsk() async {
    if (await status() != PushStatus.notDetermined) return false;
    final prefs = await SharedPreferences.getInstance();
    return !(prefs.getBool(_askedKey) ?? false);
  }

  static Future<void> markAsked() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_askedKey, true);
  }

  static Future<void> openSettings() async {
    if (!supported) return;
    await _channel.invokeMethod<void>('openSettings');
  }

  /// Before sign-out: this iPhone should no longer get the account's notifications.
  static Future<void> unregister() async {
    if (!supported) return;
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    if (token == null) return;
    await Api.post('device', {'op': 'unregister', 'token': token}).timeout(const Duration(seconds: 5), onTimeout: () => const ApiResult.fail(''));
    await prefs.remove(_tokenKey);
  }

  static Future<ApiResult<dynamic>> test() => Api.post('device', {'op': 'test'});

  static String? _active;
  static String? get active => _active;

  /// The deep link on screen right now (e.g. the open table): its pushes are not shown as banners.
  static void setActive(String url) {
    _active = url;
    if (supported) _channel.invokeMethod<void>('setActive', url).catchError((_) {});
  }

  static void clearActive(String url) {
    if (_active != url) return;
    _active = null;
    if (supported) _channel.invokeMethod<void>('setActive', null).catchError((_) {});
  }

  static Future<void> _sendToken(String? token, String? environment) async {
    if (token == null || (environment != 'sandbox' && environment != 'production')) return;
    final res = await Api.post('device', {'op': 'register', 'token': token, 'environment': environment});
    if (res.ok) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
    }
  }
}
