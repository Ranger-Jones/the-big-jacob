import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';

/// Result of an API call: either data or a German error message for the user.
class ApiResult<T> {
  final T? data;
  final String? error;
  const ApiResult.ok(this.data) : error = null;
  const ApiResult.fail(this.error) : data = null;
  bool get ok => error == null;
}

/// Talks to /api/app on the web server; the Supabase access token proves who we are.
class Api {
  static final _client = http.Client();

  static Map<String, String> _headers() {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    return {'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token'};
  }

  static Future<ApiResult<dynamic>> get(String path, [Map<String, String>? query]) =>
      _send(() => _client.get(Uri.parse('${Config.apiBase}/api/app/$path').replace(queryParameters: query), headers: _headers()));

  static Future<ApiResult<dynamic>> post(String path, [Map<String, dynamic> body = const {}]) =>
      _send(() => _client.post(Uri.parse('${Config.apiBase}/api/app/$path'), headers: _headers(), body: jsonEncode(body)));

  static Future<ApiResult<dynamic>> _send(Future<http.Response> Function() request) async {
    try {
      var res = await request().timeout(const Duration(seconds: 20));
      if (res.statusCode == 401) {
        // The access token expired while the app slept: refresh once and retry.
        await Supabase.instance.client.auth.refreshSession();
        res = await request().timeout(const Duration(seconds: 20));
      }
      final body = jsonDecode(utf8.decode(res.bodyBytes));
      if (body is Map && body['ok'] == true) return ApiResult.ok(body['data']);
      return ApiResult.fail(body is Map && body['error'] is String ? body['error'] as String : 'Unbekannter Fehler.');
    } catch (_) {
      return const ApiResult.fail('Keine Verbindung zum Hof. Bitte nochmal versuchen.');
    }
  }

  static String artUrl(String id, {int rank = 1, String bg = '#3d2361', bool full = true, bool numeral = true}) =>
      Uri.parse('${Config.apiBase}/api/app/art/$id').replace(queryParameters: {
        'rank': '$rank',
        'bg': bg,
        if (!full) 'kind': 'icon',
        if (!numeral) 'numeral': '0',
      }).toString();
}
