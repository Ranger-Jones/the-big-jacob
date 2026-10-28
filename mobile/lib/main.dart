import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'screens/auth_screen.dart';
import 'screens/gate_screen.dart';
import 'screens/shell.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent));
  await Supabase.initialize(url: Config.supabaseUrl, publishableKey: Config.supabaseKey);
  final prefs = await SharedPreferences.getInstance();
  if (Config.devEmail.isNotEmpty && Supabase.instance.client.auth.currentSession == null) {
    await prefs.setBool('gate_open', true);
    await Supabase.instance.client.auth.signInWithPassword(email: Config.devEmail, password: Config.devPassword);
  }
  runApp(JakobApp(gateOpen: prefs.getBool('gate_open') ?? false));
}

class JakobApp extends StatefulWidget {
  final bool gateOpen;
  const JakobApp({super.key, required this.gateOpen});

  @override
  State<JakobApp> createState() => _JakobAppState();
}

class _JakobAppState extends State<JakobApp> {
  late bool _gateOpen = widget.gateOpen;

  Future<void> _openGate(String answer) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('gate_open', true);
    // Registration repeats the answer to the server, so it is kept on the device.
    await prefs.setString('gate_answer', answer);
    setState(() => _gateOpen = true);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Der Große Jakob',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: !_gateOpen
          ? GateScreen(onOpen: _openGate)
          : StreamBuilder<AuthState>(
              stream: Supabase.instance.client.auth.onAuthStateChange,
              builder: (context, _) {
                final session = Supabase.instance.client.auth.currentSession;
                return AnimatedSwitcher(
                  duration: const Duration(milliseconds: 400),
                  child: session == null ? const AuthScreen(key: ValueKey('auth')) : Shell(key: ValueKey(session.user.id)),
                );
              },
            ),
    );
  }
}
