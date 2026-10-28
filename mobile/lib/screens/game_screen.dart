import 'package:flutter/material.dart';

Future<void> openTable(BuildContext context, String code) =>
    Navigator.push(context, MaterialPageRoute(builder: (_) => GameScreen(code: code)));

class GameScreen extends StatelessWidget {
  final String code;
  const GameScreen({super.key, required this.code});
  @override
  Widget build(BuildContext context) => Scaffold(body: Center(child: Text(code)));
}
