import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Sign in or create an account (same accounts as on the website).
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _register = false;
  bool _busy = false;
  String? _error;
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _username = TextEditingController();

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final auth = Supabase.instance.client.auth;
    String? error;
    if (_register) {
      final answer = (await SharedPreferences.getInstance()).getString('gate_answer') ?? '';
      final res = await Api.post('register', {
        'answer': answer, 'email': _email.text.trim(), 'password': _password.text, 'username': _username.text.trim(),
      });
      if (!res.ok) {
        error = res.error;
      } else {
        final session = (res.data as Map)['session'];
        if (session is Map) {
          await auth.setSession(session['refresh_token'] as String);
        } else {
          error = 'Fast geschafft: Bitte bestätige deine E-Mail und melde dich dann an.';
        }
      }
    } else {
      try {
        await auth.signInWithPassword(email: _email.text.trim(), password: _password.text);
      } on AuthException {
        error = 'E-Mail oder Passwort falsch.';
      } catch (_) {
        error = 'Keine Verbindung zum Hof. Bitte nochmal versuchen.';
      }
    }
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = error;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Backdrop(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: AnimatedSize(
                duration: const Duration(milliseconds: 260),
                curve: Curves.easeOutCubic,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Text(_register ? 'Am Hof anmelden' : 'Willkommen zurück', style: T.display(42)),
                  const SizedBox(height: 6),
                  Text(_register ? 'Ein Name, und der Thron wartet auf dich.' : 'Log dich ein, der Thron wartet.', style: T.body(17, color: C.inkSoft)),
                  const SizedBox(height: 28),
                  if (_register) ...[
                    TextField(controller: _username, style: T.body(17), textInputAction: TextInputAction.next, autocorrect: false,
                        decoration: const InputDecoration(labelText: 'Benutzername', prefixIcon: Icon(Icons.person_rounded))),
                    const SizedBox(height: 14),
                  ],
                  TextField(controller: _email, style: T.body(17), keyboardType: TextInputType.emailAddress, autocorrect: false,
                      textInputAction: TextInputAction.next, decoration: const InputDecoration(labelText: 'E-Mail', prefixIcon: Icon(Icons.mail_rounded))),
                  const SizedBox(height: 14),
                  TextField(controller: _password, style: T.body(17), obscureText: true, textInputAction: TextInputAction.go, onSubmitted: (_) => _submit(),
                      decoration: InputDecoration(labelText: 'Passwort', prefixIcon: const Icon(Icons.lock_rounded), helperText: _register ? 'Mindestens 8 Zeichen' : null)),
                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Text(_error!, style: T.body(15, color: C.wax, weight: FontWeight.w700)).animate().fadeIn().shakeX(amount: 4),
                  ],
                  const SizedBox(height: 22),
                  GoldButton(label: _register ? 'Konto erstellen' : 'Einloggen', busy: _busy, onPressed: _submit),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => setState(() {
                      _register = !_register;
                      _error = null;
                    }),
                    child: Text(_register ? 'Schon dabei? Einloggen' : 'Noch kein Konto? Registrieren', style: T.body(16, color: C.goldSoft, weight: FontWeight.w700)),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
